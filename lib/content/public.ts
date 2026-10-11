import { Types, type QueryFilter } from "mongoose";
import type { CategoryCode, DIFFICULTIES, Section } from "@/config/categories";
import { EconomicIndicator, type EconomicIndicatorDoc } from "@/lib/models/EconomicIndicator";
import { ImportedItem, type ImportedItemDoc } from "@/lib/models/ImportedItem";
import { Translation } from "@/lib/models/Translation";

export interface PublicItemQuery {
  page: number;
  limit: number;
  skip: number;
  lang?: "en" | "gu";
  category?: string;
  classLevel?: string;
  board?: string;
  difficulty?: string;
  from?: Date;
  to?: Date;
}

type ItemLean = ImportedItemDoc & { _id: Types.ObjectId };

/** Students only ever see approved items; everything else is filtered here. */
function publishedFilter(section: Section, q: Partial<PublicItemQuery>): QueryFilter<ImportedItemDoc> {
  const filter: QueryFilter<ImportedItemDoc> = { reviewStatus: "approved", "publication.section": section };
  if (q.category) filter["publication.category"] = q.category as CategoryCode;
  if (q.classLevel) filter.$or = [{ "publication.classLevels": q.classLevel }, { "publication.classLevels": { $size: 0 } }];
  if (q.board) {
    filter.$and = [{ $or: [{ "publication.boards": q.board }, { "publication.boards": { $size: 0 } }] }];
  }
  if (q.difficulty) filter["publication.difficulty"] = q.difficulty as (typeof DIFFICULTIES)[number];
  if (q.from || q.to) {
    filter.publishedAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  }
  return filter;
}

async function toPublicItems(items: ItemLean[], lang?: "en" | "gu") {
  const needTranslation = lang ? items.filter((i) => i.originalLanguage !== lang).map((i) => i._id) : [];
  const translations = needTranslation.length
    ? await Translation.find({ importedItemId: { $in: needTranslation }, language: lang, reviewStatus: "approved" }).lean()
    : [];
  const byItem = new Map(translations.map((t) => [String(t.importedItemId), t]));

  return items.map((item) => {
    const t = byItem.get(String(item._id));
    const pub = item.publication!;
    return {
      id: String(item._id),
      section: pub.section,
      title: t?.translatedTitle ?? pub.title,
      summary: t ? t.translatedSummary || pub.summary : pub.summary,
      displayLanguage: t ? t.language : item.originalLanguage,
      originalLanguage: item.originalLanguage,
      isTranslation: Boolean(t),
      translationMethod: t?.translationMethod,
      translationUnavailable: Boolean(lang && lang !== item.originalLanguage && !t),
      category: pub.category,
      classLevels: pub.classLevels ?? [],
      boards: pub.boards ?? [],
      difficulty: pub.difficulty,
      source: { name: item.sourceName, url: item.isSample ? null : item.canonicalUrl },
      publishedAt: item.publishedAt,
      retrievedAt: item.retrievedAt,
      approvedAt: item.publishedToStudentsAt,
      isSample: Boolean(item.isSample),
    };
  });
}

export async function listPublished(section: Section, q: PublicItemQuery) {
  const filter = publishedFilter(section, q);
  const [items, total] = await Promise.all([
    ImportedItem.find(filter)
      .sort({ publishedAt: -1, _id: -1 })
      .skip(q.skip)
      .limit(q.limit)
      .select("-originalText -summaryDraft -publicationHistory -contentFingerprint")
      .lean<ItemLean[]>(),
    ImportedItem.countDocuments(filter),
  ]);
  return { items: await toPublicItems(items, q.lang), total };
}

export async function getPublished(id: string, sections: Section[], lang?: "en" | "gu") {
  if (!Types.ObjectId.isValid(id)) return null;
  const item = await ImportedItem.findOne({ _id: id, reviewStatus: "approved", "publication.section": { $in: sections } })
    .select("-originalText -summaryDraft -publicationHistory -contentFingerprint")
    .lean<ItemLean>();
  if (!item) return null;
  const [dto] = await toPublicItems([item], lang);
  return dto;
}

type IndicatorLean = EconomicIndicatorDoc & { _id: Types.ObjectId };

function toPublicIndicator(i: IndicatorLean) {
  return {
    id: String(i._id),
    code: i.indicatorCode,
    name: i.name,
    nameGu: i.nameGu,
    description: i.description,
    descriptionGu: i.descriptionGu,
    value: i.value,
    unit: i.unit,
    referencePeriod: i.referencePeriod,
    frequency: i.frequency,
    geography: i.geography,
    revisionStatus: i.revisionStatus,
    source: { name: i.sourceName, url: i.isSample ? null : i.sourceUrl },
    releaseDate: i.releaseDate,
    lastUpdated: i.retrievedAt,
    isSample: Boolean(i.isSample),
  };
}

/** Latest verified value of every indicator. Each card keeps its own period; periods are never mixed. */
export async function listLatestIndicators(geography = "India") {
  const docs = await EconomicIndicator.aggregate<IndicatorLean>([
    { $match: { isLatest: true, isVerified: true, geography } },
    { $sort: { indicatorCode: 1, referencePeriod: -1 } },
    { $group: { _id: "$indicatorCode", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { indicatorCode: 1 } },
  ]);
  return docs.map(toPublicIndicator);
}

export async function getIndicatorSeries(code: string, geography = "India") {
  const docs = await EconomicIndicator.find({ indicatorCode: code, geography, isVerified: true })
    .sort({ referencePeriod: -1, createdAt: -1 })
    .limit(60)
    .lean<IndicatorLean[]>();
  if (docs.length === 0) return null;
  const current = docs.filter((d) => d.isLatest);
  const superseded = docs.filter((d) => !d.isLatest);
  return {
    latest: current[0] ? toPublicIndicator(current[0]) : null,
    series: current.map(toPublicIndicator),
    revisions: superseded.map(toPublicIndicator),
  };
}
