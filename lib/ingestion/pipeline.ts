import { clampContentPolicy, findApprovedDomain, type ContentPolicy } from "@/config/approved-sources";
import { SECTIONS, type CategoryCode, type Section } from "@/config/categories";
import { ImportedItem } from "@/lib/models/ImportedItem";
import { env } from "@/lib/env";
import { classify } from "./classify";
import { canonicalizeUrl, containsFigures, contentFingerprint, detectLanguage, truncate } from "./text";
import { createMachineDraft, getTranslationProvider } from "./translation";
import type { RawItem, RecordError, SourceLike } from "./adapters/types";

export interface ItemCounts {
  created: number;
  updated: number;
  skipped: number;
  duplicate: number;
  failed: number;
  recordErrors: RecordError[];
  createdIds: string[];
}

const TEXT_LIMITS: Record<ContentPolicy, number> = {
  "metadata-only": 0,
  excerpt: 400,
  "full-text": 20_000,
};

/** The content policy actually applied: the source's choice, capped by what its domain permits. */
export function effectiveContentPolicy(source: SourceLike): ContentPolicy {
  const requested = (source.integrationConfig?.contentPolicy ?? "excerpt") as ContentPolicy;
  if (source.sourceType === "sample") return requested;
  const host = new URL(source.integrationConfig?.feedUrl ?? source.baseUrl).hostname;
  const approved = findApprovedDomain(host, env.extraAllowedDomains);
  return clampContentPolicy(requested, approved?.maxContentPolicy ?? "metadata-only");
}

export interface NormalizedItem {
  externalId: string;
  canonicalUrl: string;
  title: string;
  originalLanguage: "en" | "gu";
  originalText: string;
  summaryDraft: string;
  category: CategoryCode;
  relevanceScore: number;
  suggestedSection: Section;
  publishedAt?: Date;
  contentFingerprint: string;
  flags: { needsTranslation: boolean; needsAcademicReview: boolean; needsFactCheck: boolean };
  matchedKeywords: string[];
}

/** Pure normalisation step — no I/O, so it is easy to test. */
export function normalizeItem(raw: RawItem, source: SourceLike, policy: ContentPolicy): NormalizedItem {
  const title = raw.title.trim().replace(/\s+/g, " ");
  if (!title) throw new Error("Empty title");
  if (title.length > 500) throw new Error("Title too long");
  const canonicalUrl = canonicalizeUrl(raw.url);
  const fullText = raw.text.trim();
  const originalText = truncate(fullText, TEXT_LIMITS[policy]);
  const fallbackLang = source.integrationConfig?.language === "gu" ? "gu" : "en";
  const originalLanguage = raw.language ?? detectLanguage(`${title} ${fullText}`, fallbackLang);
  const allowed = (source.categories ?? []) as CategoryCode[];
  const cls = classify(title, fullText, allowed.length ? allowed : undefined);
  const defaultSection = (source.integrationConfig?.defaultSection ?? "news") as Section;
  const suggestedSection = (SECTIONS as readonly string[]).includes(raw.section ?? "")
    ? (raw.section as Section)
    : defaultSection;

  return {
    externalId: raw.externalId.slice(0, 500),
    canonicalUrl,
    title,
    originalLanguage,
    originalText,
    // A draft for the editor; students only ever see the editor's approved summary.
    summaryDraft: truncate(fullText, Math.min(300, TEXT_LIMITS[policy] || 0)),
    category: cls.category,
    relevanceScore: cls.relevance,
    suggestedSection,
    publishedAt: raw.publishedAt,
    contentFingerprint: contentFingerprint(title, fullText),
    flags: {
      needsTranslation: true,
      needsAcademicReview: suggestedSection === "learning-resource",
      needsFactCheck: containsFigures(`${title} ${fullText}`),
    },
    matchedKeywords: cls.matched,
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

/**
 * Normalises, de-duplicates and stores items in the review queue. Items are
 * never published here: everything lands with reviewStatus "pending".
 */
export async function ingestItems(source: SourceLike, rawItems: RawItem[], now = new Date()): Promise<ItemCounts> {
  const counts: ItemCounts = { created: 0, updated: 0, skipped: 0, duplicate: 0, failed: 0, recordErrors: [], createdIds: [] };
  const policy = effectiveContentPolicy(source);
  const filterByCategory = (source.categories ?? []).length > 0;
  const provider = getTranslationProvider();
  const seen = new Set<string>();

  for (const raw of rawItems) {
    try {
      const item = normalizeItem(raw, source, policy);
      if (seen.has(item.canonicalUrl)) {
        counts.duplicate++;
        continue;
      }
      seen.add(item.canonicalUrl);

      // Only import the categories selected for this source.
      if (filterByCategory && item.matchedKeywords.length === 0) {
        counts.skipped++;
        continue;
      }

      const existing = await ImportedItem.findOne({
        $or: [{ sourceId: source._id, externalId: item.externalId }, { canonicalUrl: item.canonicalUrl }],
      });

      if (existing) {
        if (existing.contentFingerprint === item.contentFingerprint) {
          counts.duplicate++;
          continue;
        }
        // The source changed the item: refresh the original, keep the editor's work.
        existing.title = item.title;
        existing.originalText = item.originalText;
        existing.summaryDraft = item.summaryDraft;
        existing.contentFingerprint = item.contentFingerprint;
        existing.retrievedAt = now;
        if (item.publishedAt) existing.publishedAt = item.publishedAt;
        if (existing.reviewStatus !== "pending") existing.set("flags.sourceUpdatedAfterReview", true);
        await existing.save();
        counts.updated++;
        continue;
      }

      // Same content republished under another URL or by another source.
      if (await ImportedItem.exists({ contentFingerprint: item.contentFingerprint })) {
        counts.duplicate++;
        continue;
      }

      const doc = await ImportedItem.create({
        sourceId: source._id,
        sourceName: source.name,
        externalId: item.externalId,
        canonicalUrl: item.canonicalUrl,
        title: item.title,
        originalLanguage: item.originalLanguage,
        originalText: item.originalText,
        contentPolicy: policy,
        summaryDraft: item.summaryDraft,
        category: item.category,
        relevanceScore: item.relevanceScore,
        suggestedSection: item.suggestedSection,
        publishedAt: item.publishedAt,
        retrievedAt: now,
        contentFingerprint: item.contentFingerprint,
        flags: item.flags,
        isSample: Boolean(source.isSample),
        reviewStatus: "pending",
      });
      counts.created++;
      counts.createdIds.push(String(doc._id));

      if (provider) {
        await createMachineDraft(doc, provider).catch((err: Error) =>
          counts.recordErrors.push({ externalId: item.externalId, message: `Translation draft failed: ${err.message}` }),
        );
      }
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        counts.duplicate++;
        continue;
      }
      counts.failed++;
      counts.recordErrors.push({ externalId: raw.externalId || "(unknown)", message: (err as Error).message });
    }
  }
  return counts;
}
