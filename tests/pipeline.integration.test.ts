import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getIndicatorSeries, listLatestIndicators, listPublished } from "@/lib/content/public";
import { applyReview, ReviewError, saveTranslation } from "@/lib/content/review";
import { connectDB, disconnectDB } from "@/lib/db";
import { ingestIndicators } from "@/lib/ingestion/indicators";
import { enqueueSync, runDueSyncs, runJob, SyncNotAllowedError } from "@/lib/ingestion/sync";
import type { Fetcher, RawIndicator } from "@/lib/ingestion/adapters/types";
import { ContentAuditLog } from "@/lib/models/ContentAuditLog";
import { DataSource } from "@/lib/models/DataSource";
import { EconomicIndicator } from "@/lib/models/EconomicIndicator";
import { ImportedItem } from "@/lib/models/ImportedItem";
import { FetchError } from "@/lib/security/safe-fetch";

let mongo: MongoMemoryServer;
const actor = { id: "000000000000000000000001", email: "editor@test" };
const T0 = new Date("2026-10-01T00:00:00Z");
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);
const noSleep = async () => {};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri("ecolearn-test"));
  await Promise.all([ImportedItem.syncIndexes(), EconomicIndicator.syncIndexes()]);
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  await Promise.all(
    ["dataSources", "importedItems", "economicIndicators", "syncJobs", "contentAuditLogs", "translations"].map((c) => mongoose.connection.collection(c).deleteMany({})),
  );
});

async function sampleSource(dataset: "sample-news" | "sample-indicators") {
  return DataSource.create({
    name: `Sample ${dataset}`,
    sourceType: "sample",
    baseUrl: "https://sample.ecolearn.invalid",
    integrationConfig: { dataset, language: "en", contentPolicy: "full-text", defaultSection: "news" },
    isEnabled: true,
    isSample: true,
    fetchIntervalMinutes: 60,
    accessReview: { termsReviewed: true },
  });
}

function rssXml(items: { guid: string; title: string; body: string; link?: string }[]) {
  return `<?xml version="1.0"?><rss version="2.0"><channel>${items
    .map(
      (i) =>
        `<item><guid>${i.guid}</guid><title>${i.title}</title><link>${i.link ?? `https://www.rbi.org.in/pr?id=${i.guid}`}</link><description>${i.body}</description><pubDate>Wed, 01 Oct 2026 10:00:00 GMT</pubDate></item>`,
    )
    .join("")}</channel></rss>`;
}

async function rssSource(overrides: Record<string, unknown> = {}) {
  return DataSource.create({
    name: "RBI test feed",
    sourceType: "rss",
    baseUrl: "https://www.rbi.org.in",
    integrationConfig: { feedUrl: "https://www.rbi.org.in/pressreleases_rss.xml", language: "en", contentPolicy: "full-text", defaultSection: "news" },
    isEnabled: true,
    fetchIntervalMinutes: 60,
    accessReview: { termsReviewed: true },
    ...overrides,
  });
}

const feedFetcher =
  (body: () => string): Fetcher =>
  async (url) => ({ status: 200, finalUrl: url, contentType: "application/rss+xml", body: body() });

async function sync(sourceId: unknown, now: Date, fetch?: Fetcher) {
  const { job } = await enqueueSync(String(sourceId), { trigger: "manual", actor, now });
  return runJob(String(job._id), { now: () => now, fetch, sleep: noSleep });
}

describe("ingestion pipeline", () => {
  it("imports sample items into the review queue and de-duplicates repeat syncs", async () => {
    const source = await sampleSource("sample-news");
    const job = await sync(source._id, T0);
    expect(job?.status).toBe("succeeded");
    expect(job?.itemsCreated).toBe(5);
    expect(await ImportedItem.countDocuments({ reviewStatus: "pending", isSample: true })).toBe(5);

    const gu = await ImportedItem.findOne({ externalId: "sample-news-003" });
    expect(gu?.originalLanguage).toBe("gu");
    expect(gu?.category).toBe("budget");

    // Fetching again within the permitted interval is refused.
    await expect(enqueueSync(String(source._id), { trigger: "manual", actor, now: T0 })).rejects.toThrow(SyncNotAllowedError);

    const again = await sync(source._id, minutes(2));
    expect(again?.itemsCreated).toBe(0);
    expect(again?.itemsDuplicate).toBe(5);
    expect(await ImportedItem.countDocuments()).toBe(5);
  });

  it("applies content policy, category filters and detects updates at source", async () => {
    let body = "The MPC kept the repo rate at 5.5% citing inflation.";
    const source = await rssSource({
      categories: ["monetary-policy"],
      integrationConfig: { feedUrl: "https://www.rbi.org.in/pressreleases_rss.xml", language: "en", contentPolicy: "excerpt", defaultSection: "news" },
    });
    const fetcher = feedFetcher(() =>
      rssXml([
        { guid: "a", title: "Monetary policy statement", body: `${body} ${"Detail. ".repeat(100)}` },
        { guid: "b", title: "Holiday notice for staff", body: "Offices closed." },
      ]),
    );

    const first = await sync(source._id, T0, fetcher);
    expect(first).toMatchObject({ itemsCreated: 1, itemsSkipped: 1, status: "succeeded" });
    const item = await ImportedItem.findOne({ externalId: "a" });
    expect(item!.originalText!.length).toBeLessThanOrEqual(401); // excerpt policy
    expect(item!.flags?.needsFactCheck).toBe(true);

    await applyReview(
      String(item!._id),
      {
        action: "approve",
        section: "news",
        title: "RBI holds repo rate",
        summary: "The central bank left its key lending rate unchanged to keep prices in check.",
        category: "monetary-policy",
        classLevels: [],
        boards: [],
        factChecked: true,
        academicReviewed: false,
      },
      actor,
    );

    body = "The MPC kept the repo rate at 5.25% citing inflation.";
    const second = await sync(source._id, minutes(61), fetcher);
    expect(second?.itemsUpdated).toBe(1);
    const updated = await ImportedItem.findById(item!._id);
    expect(updated?.flags?.sourceUpdatedAfterReview).toBe(true);
    expect(updated?.reviewStatus).toBe("approved");
    expect(updated?.publication?.title).toBe("RBI holds repo rate");
  });

  it("records per-record failures as a partial sync", async () => {
    const source = await rssSource();
    const fetcher = feedFetcher(() =>
      rssXml([
        { guid: "ok", title: "Repo rate decision", body: "Policy rate held." },
        { guid: "bad", title: "Phishing", body: "x", link: "https://evil.example.com/" },
      ]),
    );
    const job = await sync(source._id, T0, fetcher);
    expect(job).toMatchObject({ status: "partial", itemsCreated: 1, itemsFailed: 1, retryable: true });
    expect(job?.recordErrors[0].externalId).toBe("bad");
  });

  it("backs off, alerts after repeated failures and recovers", async () => {
    const source = await rssSource();
    const failing: Fetcher = async () => {
      throw new FetchError("HTTP 503", true, 503);
    };

    let now = T0;
    for (let i = 1; i <= 3; i++) {
      const job = await sync(source._id, now, failing);
      expect(job).toMatchObject({ status: "failed", retryable: true, attempts: 3 });
      const s = await DataSource.findById(source._id);
      expect(s?.consecutiveFailures).toBe(i);
      expect(s!.nextRunAt!.getTime() - now.getTime()).toBe(60 * 2 ** i * 60_000);
      now = new Date(now.getTime() + 61 * 60_000);
    }
    const alerted = await DataSource.findById(source._id);
    expect(alerted?.alertActive).toBe(true);
    expect(await ContentAuditLog.countDocuments({ action: "source.alert" })).toBe(1);

    const ok = await sync(source._id, now, feedFetcher(() => rssXml([{ guid: "z", title: "Repo rate", body: "Held." }])));
    expect(ok?.status).toBe("succeeded");
    const recovered = await DataSource.findById(source._id);
    expect(recovered).toMatchObject({ consecutiveFailures: 0, alertActive: false });
  });

  it("prevents concurrent syncs of the same source", async () => {
    const source = await sampleSource("sample-news");
    const { job, existing } = await enqueueSync(String(source._id), { trigger: "manual", actor, now: T0 });
    expect(existing).toBe(false);
    const dup = await enqueueSync(String(source._id), { trigger: "manual", actor, now: T0 });
    expect(dup.existing).toBe(true);
    expect(String(dup.job._id)).toBe(String(job._id));

    // Simulate a lock held by another worker.
    await DataSource.updateOne({ _id: source._id }, { $set: { syncLock: { jobId: new mongoose.Types.ObjectId(), lockedUntil: minutes(10) } } });
    const skipped = await runJob(String(job._id), { now: () => T0 });
    expect(skipped?.status).toBe("skipped");
    expect(await ImportedItem.countDocuments()).toBe(0);

    // Claiming is atomic: a job can only run once.
    expect(await runJob(String(job._id), { now: () => T0 })).toBeNull();
  });

  it("refuses sources whose terms have not been reviewed and runs due sources on schedule", async () => {
    const unreviewed = await rssSource({ accessReview: { termsReviewed: false } });
    await expect(enqueueSync(String(unreviewed._id), { trigger: "manual", actor })).rejects.toThrow(/Terms of use/);

    await sampleSource("sample-news");
    await sampleSource("sample-indicators");
    const summary = await runDueSyncs({ now: () => T0, sleep: noSleep });
    expect(summary.ran).toBe(2);
    expect(await ImportedItem.countDocuments()).toBe(5);
    expect(await EconomicIndicator.countDocuments()).toBe(6);
    // Nothing is due again until the interval passes.
    expect((await runDueSyncs({ now: () => minutes(5), sleep: noSleep })).ran).toBe(0);
  });
});

describe("economic indicators", () => {
  const raw = (value: number, revisionStatus: RawIndicator["revisionStatus"] = "provisional"): RawIndicator => ({
    indicatorCode: "TEST.CPI",
    name: "CPI inflation",
    value,
    unit: "%",
    referencePeriod: "2026-08",
    frequency: "monthly",
    geography: "India",
    sourceUrl: "https://example.invalid/cpi",
    revisionStatus,
  });

  it("keeps revision history and only shows verified latest values", async () => {
    const source = await sampleSource("sample-indicators");
    const like = source.toObject() as never;

    expect((await ingestIndicators(like, [raw(3.4)], T0)).created).toBe(1);
    expect((await ingestIndicators(like, [raw(3.4)], minutes(1))).duplicate).toBe(1);
    expect(await listLatestIndicators()).toHaveLength(0); // unverified

    await EconomicIndicator.updateMany({}, { $set: { isVerified: true } });
    expect((await listLatestIndicators())[0]).toMatchObject({ value: 3.4, referencePeriod: "2026-08", revisionStatus: "provisional" });

    const revised = await ingestIndicators(like, [raw(3.6)], minutes(2));
    expect(revised.updated).toBe(1);
    const all = await EconomicIndicator.find({ indicatorCode: "TEST.CPI" }).sort({ createdAt: 1 });
    expect(all.map((d) => [d.value, d.isLatest, d.revisionStatus])).toEqual([
      [3.4, false, "provisional"],
      [3.6, true, "revised"],
    ]);
    expect(String(all[1].supersedes)).toBe(String(all[0]._id));
    expect(all[1].isVerified).toBe(false);

    await EconomicIndicator.updateOne({ _id: all[1]._id }, { $set: { isVerified: true } });
    const series = await getIndicatorSeries("TEST.CPI");
    expect(series?.latest?.value).toBe(3.6);
    expect(series?.revisions.map((r) => r.value)).toEqual([3.4]);
  });
});

describe("review workflow and student visibility", () => {
  async function importSamples() {
    const source = await sampleSource("sample-news");
    await sync(source._id, T0);
    return ImportedItem.findOne({ externalId: "sample-news-001" });
  }

  const approval = {
    action: "approve" as const,
    section: "news" as const,
    title: "Central bank keeps repo rate unchanged",
    summary: "The central bank held its key lending rate steady and will keep watching prices.",
    category: "monetary-policy" as const,
    classLevels: [],
    boards: [],
    factChecked: false,
    academicReviewed: false,
  };

  it("hides pending items from students and enforces review checks", async () => {
    const item = await importSamples();
    const q = { page: 1, limit: 10, skip: 0 };
    expect((await listPublished("news", q)).total).toBe(0);

    // Learning resources need academic review confirmation.
    await expect(
      applyReview(String(item!._id), { ...approval, section: "learning-resource", difficulty: "beginner" }, actor),
    ).rejects.toThrow(/academic review/);

    // Copying the source verbatim is refused.
    await expect(
      applyReview(String(item!._id), { ...approval, summary: item!.originalText.replace("[Sample text for demonstration] ", "") }, actor),
    ).rejects.toThrow(ReviewError);

    await applyReview(String(item!._id), approval, actor);
    const listed = await listPublished("news", q);
    expect(listed.total).toBe(1);
    expect(listed.items[0]).toMatchObject({ title: approval.title, isSample: true, source: { url: null } });
    expect(listed.items[0]).not.toHaveProperty("originalText");
  });

  it("serves approved Gujarati translations only, and supports archive and rollback", async () => {
    const item = await importSamples();
    const id = String(item!._id);
    await applyReview(id, approval, actor);
    const q = { page: 1, limit: 10, skip: 0, lang: "gu" as const };

    expect((await listPublished("news", q)).items[0]).toMatchObject({ translationUnavailable: true, displayLanguage: "en" });

    await saveTranslation(id, { language: "gu", translatedTitle: "રેપો દર યથાવત", translatedSummary: "મધ્યસ્થ બેંકે દર યથાવત રાખ્યો.", reviewStatus: "draft" }, actor);
    expect((await listPublished("news", q)).items[0].isTranslation).toBe(false);

    await saveTranslation(id, { language: "gu", translatedTitle: "રેપો દર યથાવત", translatedSummary: "મધ્યસ્થ બેંકે દર યથાવત રાખ્યો.", reviewStatus: "approved" }, actor);
    expect((await listPublished("news", q)).items[0]).toMatchObject({ title: "રેપો દર યથાવત", isTranslation: true, displayLanguage: "gu" });

    await expect(saveTranslation(id, { language: "en", translatedTitle: "x", translatedSummary: "", reviewStatus: "draft" }, actor)).rejects.toThrow(
      /different language/,
    );

    await applyReview(id, { ...approval, action: "edit", title: "Edited headline about the repo rate" }, actor);
    expect((await listPublished("news", { page: 1, limit: 10, skip: 0 })).items[0].title).toBe("Edited headline about the repo rate");

    await applyReview(id, { action: "rollback", version: 1 }, actor);
    expect((await listPublished("news", { page: 1, limit: 10, skip: 0 })).items[0].title).toBe(approval.title);

    await applyReview(id, { action: "archive" }, actor);
    expect((await listPublished("news", { page: 1, limit: 10, skip: 0 })).total).toBe(0);

    const history = (await ImportedItem.findById(id))!.publicationHistory.map((h) => h.action);
    expect(history).toEqual(["approve", "edit", "rollback", "archive"]);
    expect(await ContentAuditLog.countDocuments({ entityId: id })).toBeGreaterThanOrEqual(6);
  });

  it("requires a reason to reject and filters by class level", async () => {
    const item = await importSamples();
    await applyReview(String(item!._id), { action: "reject", reason: "Not relevant" }, actor);
    expect((await ImportedItem.findById(item!._id))?.rejectionReason).toBe("Not relevant");

    const ca = await ImportedItem.findOne({ externalId: "sample-news-004" });
    await applyReview(
      String(ca!._id),
      { ...approval, section: "current-affairs", category: "employment", classLevels: ["12"], summary: "Joblessness in cities stayed about the same as last quarter." },
      actor,
    );
    expect((await listPublished("current-affairs", { page: 1, limit: 10, skip: 0, classLevel: "12" })).total).toBe(1);
    expect((await listPublished("current-affairs", { page: 1, limit: 10, skip: 0, classLevel: "11" })).total).toBe(0);
  });
});
