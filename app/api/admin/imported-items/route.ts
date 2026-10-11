import type { QueryFilter } from "mongoose";
import { CATEGORY_CODES, SECTIONS } from "@/config/categories";
import { escapeRegex, handle, objectId, paged, pagination, privateJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { ImportedItem, REVIEW_STATUSES, type ImportedItemDoc } from "@/lib/models/ImportedItem";

const FLAGS = ["needsTranslation", "needsAcademicReview", "needsFactCheck", "sourceUpdatedAfterReview"] as const;

export const GET = handle(async (req) => {
  await requireRole(req, STAFF);
  const p = req.nextUrl.searchParams;
  const { page, limit, skip } = pagination(req, 100);
  const filter: QueryFilter<ImportedItemDoc> = {};

  const status = p.get("status");
  if (status && (REVIEW_STATUSES as readonly string[]).includes(status)) filter.reviewStatus = status as ImportedItemDoc["reviewStatus"];
  const sourceId = p.get("sourceId");
  if (sourceId) filter.sourceId = objectId.parse(sourceId);
  const category = p.get("category");
  if (category && (CATEGORY_CODES as readonly string[]).includes(category)) filter.category = category as ImportedItemDoc["category"];
  const section = p.get("section");
  if (section && (SECTIONS as readonly string[]).includes(section)) filter.suggestedSection = section as ImportedItemDoc["suggestedSection"];
  const lang = p.get("lang");
  if (lang === "en" || lang === "gu") filter.originalLanguage = lang;
  const flag = p.get("flag");
  if (flag && (FLAGS as readonly string[]).includes(flag)) (filter as Record<string, unknown>)[`flags.${flag}`] = true;
  const q = p.get("q")?.trim().slice(0, 100);
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: re }, { "publication.title": re }, { canonicalUrl: re }];
  }

  const [items, total] = await Promise.all([
    ImportedItem.find(filter)
      .sort({ retrievedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .select("-originalText -publicationHistory")
      .lean(),
    ImportedItem.countDocuments(filter),
  ]);
  return privateJson(paged(items, total, page, limit));
});
