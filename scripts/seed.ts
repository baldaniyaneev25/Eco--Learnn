// Seeds an admin account and the initial data sources:
//   - two SAMPLE sources (enabled) so the whole pipeline can be demonstrated
//   - real integrations (World Bank, RBI) created DISABLED until an admin has
//     confirmed their access method, terms and URLs in Web Data Manager.
// Usage: npm run seed            (idempotent)
//        npm run seed -- --demo  (also runs the sample syncs and approves a few items)

import { connectDB, disconnectDB } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { User } from "@/lib/models/User";
import { DataSource } from "@/lib/models/DataSource";
import { ImportedItem } from "@/lib/models/ImportedItem";
import { EconomicIndicator } from "@/lib/models/EconomicIndicator";
import { enqueueSync, runJob } from "@/lib/ingestion/sync";
import { applyReview } from "@/lib/content/review";
import { saveTranslation } from "@/lib/content/review";
import { seedStudyContent } from "@/lib/study/seed-study";

const SOURCES: (Record<string, unknown> & { name: string; isEnabled: boolean })[] = [
  {
    name: "EcoLearn Sample News (demo data)",
    sourceType: "sample",
    baseUrl: "https://sample.ecolearn.invalid",
    integrationConfig: { dataset: "sample-news", language: "en", contentPolicy: "full-text", defaultSection: "news" },
    categories: [],
    isEnabled: true,
    isSample: true,
    fetchIntervalMinutes: 60,
    accessReview: { notes: "Bundled sample data. Not real publications.", termsReviewed: true },
  },
  {
    name: "EcoLearn Sample Indicators (demo data)",
    sourceType: "sample",
    baseUrl: "https://sample.ecolearn.invalid",
    integrationConfig: { dataset: "sample-indicators", language: "en", contentPolicy: "full-text", defaultSection: "news" },
    categories: [],
    isEnabled: true,
    isSample: true,
    fetchIntervalMinutes: 60,
    accessReview: { notes: "Bundled illustrative values. Not official statistics.", termsReviewed: true },
  },
  {
    name: "World Bank – India macro indicators",
    sourceType: "worldbank",
    baseUrl: "https://api.worldbank.org",
    integrationConfig: {
      indicators: ["FP.CPI.TOTL.ZG", "NY.GDP.MKTP.KD.ZG", "SL.UEM.TOTL.ZS", "NY.GDP.PCAP.CD", "BN.CAB.XOKA.GD.ZS"],
      country: "IND",
      language: "en",
      contentPolicy: "full-text",
      defaultSection: "news",
    },
    categories: [],
    isEnabled: false,
    isSample: false,
    fetchIntervalMinutes: 24 * 60,
    accessReview: {
      termsUrl: "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
      license: "CC BY 4.0 (verify per indicator)",
      notes: "Open JSON API without key. Confirm licence and attribution wording, then tick 'terms reviewed' and enable.",
      termsReviewed: false,
    },
  },
  {
    name: "RBI – Press Releases (RSS)",
    sourceType: "rss",
    baseUrl: "https://www.rbi.org.in",
    integrationConfig: {
      feedUrl: "https://www.rbi.org.in/pressreleases_rss.xml",
      language: "en",
      contentPolicy: "excerpt",
      defaultSection: "news",
    },
    categories: ["monetary-policy", "inflation", "banking-finance", "gdp", "trade"],
    isEnabled: false,
    isSample: false,
    fetchIntervalMinutes: 180,
    accessReview: {
      termsUrl: "https://www.rbi.org.in/Scripts/Disclaimer.aspx",
      notes:
        "Verify the feed URL is current and review the RBI website disclaimer/copyright terms before enabling. " +
        "Only titles, links and short excerpts are stored; editors write original summaries.",
      termsReviewed: false,
    },
  },
];

async function main() {
  await connectDB();
  const email = (process.env.ADMIN_EMAIL ?? "admin@ecolearn.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!(await User.exists({ email }))) {
    if (!password || password.length < 10) {
      throw new Error("Set ADMIN_PASSWORD (min 10 chars) to create the first admin account");
    }
    await User.create({ name: "EcoLearn Admin", email, passwordHash: await hashPassword(password), role: "admin" });
    console.log(`Created admin ${email}`);
  } else {
    console.log(`Admin ${email} already exists`);
  }

  for (const source of SOURCES) {
    const existing = await DataSource.findOne({ name: source.name });
    if (existing) {
      console.log(`Source exists: ${source.name}`);
      continue;
    }
    await DataSource.create({ ...source, nextRunAt: new Date() });
    console.log(`Created source: ${source.name}${source.isEnabled ? "" : " (disabled — review terms first)"}`);
  }

  // Ensure indexes exist (unique keys are what prevent duplicate imports).
  await Promise.all([ImportedItem.syncIndexes(), EconomicIndicator.syncIndexes(), DataSource.syncIndexes()]);

  if (process.argv.includes("--demo")) await demo(email);
  await disconnectDB();
}

/** Runs the sample syncs and walks a few items through review, for a working demo. */
async function demo(adminEmail: string) {
  const actor = { email: adminEmail };
  for (const source of await DataSource.find({ isSample: true, isEnabled: true })) {
    try {
      const { job } = await enqueueSync(String(source._id), { trigger: "manual", actor });
      const done = await runJob(String(job._id));
      console.log(`Synced ${source.name}: ${done?.status} (+${done?.itemsCreated} new)`);
    } catch (err) {
      console.log(`Skipped ${source.name}: ${(err as Error).message}`);
    }
  }

  const summaries: Record<string, { summary: string; summaryGu?: string; titleGu?: string; classLevels?: string[] }> = {
    "sample-news-001": {
      summary: "Sample summary: the central bank held its key lending rate steady and said it will keep watching prices and growth.",
      titleGu: "[નમૂનો] મધ્યસ્થ બેંકે પોલિસી રેપો દર યથાવત રાખ્યો",
      summaryGu: "નમૂનો સારાંશ: મધ્યસ્થ બેંકે મુખ્ય ધિરાણ દર યથાવત રાખ્યો અને ભાવ તથા વૃદ્ધિ પર નજર રાખવાનું જણાવ્યું.",
    },
    "sample-news-002": {
      summary: "Sample summary: price rises slowed last month mainly because vegetables became cheaper, a useful example of food inflation.",
    },
    "sample-news-003": {
      summary: "નમૂનો સારાંશ: અંદાજપત્રમાં રસ્તા, રેલ્વે જેવી માળખાકીય સુવિધાઓ પર વધુ ખર્ચ અને ખાધ ઓછી કરવાનું લક્ષ્ય છે.",
      classLevels: ["11", "12"],
    },
    "sample-news-004": {
      summary: "Sample summary: a quarterly survey found the share of jobless people in cities roughly unchanged from the last quarter.",
      classLevels: ["12"],
    },
    "sample-resource-001": {
      summary: "Sample summary: an introductory guide to national income concepts and the methods used to measure them.",
      classLevels: ["11", "12"],
    },
  };
  for (const item of await ImportedItem.find({ isSample: true, reviewStatus: "pending" })) {
    const s = summaries[item.externalId];
    if (!s) continue;
    await applyReview(
      String(item._id),
      {
        action: "approve",
        section: item.suggestedSection,
        title: item.title,
        summary: s.summary,
        category: item.category,
        classLevels: s.classLevels ?? [],
        boards: [],
        difficulty: item.suggestedSection === "learning-resource" ? "beginner" : undefined,
        factChecked: true,
        academicReviewed: true,
      },
      actor,
    );
    if (s.titleGu && s.summaryGu) {
      await saveTranslation(
        String(item._id),
        { language: "gu", translatedTitle: s.titleGu, translatedSummary: s.summaryGu, reviewStatus: "approved" },
        actor,
      );
    }
  }
  const verified = await EconomicIndicator.updateMany(
    { isSample: true, isLatest: true, isVerified: false },
    { $set: { isVerified: true, verifiedBy: adminEmail, verifiedAt: new Date() } },
  );
  console.log(`Demo: approved sample items, verified ${verified.modifiedCount} sample indicator values`);
  const study = await seedStudyContent(actor);
  console.log(study.length ? `Study content added: ${study.join(", ")}` : "Study content already present");
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
