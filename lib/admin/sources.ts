import { Types } from "mongoose";
import { z } from "zod";
import { CONTENT_POLICIES, SOURCE_TYPES } from "@/config/approved-sources";
import { CATEGORY_CODES, SECTIONS } from "@/config/categories";
import { ApiError } from "@/lib/api";
import { getAdapter } from "@/lib/ingestion/adapters";
import type { SourceLike } from "@/lib/ingestion/adapters/types";
import { DataSource, type DataSourceDoc } from "@/lib/models/DataSource";
import { ImportedItem } from "@/lib/models/ImportedItem";
import { SyncJob } from "@/lib/models/SyncJob";
import { validateSourceUrl } from "@/lib/security/url-guard";

const SAMPLE_BASE_URL = "https://sample.ecolearn.invalid";
const WORLD_BANK_BASE_URL = "https://api.worldbank.org";

const IntegrationConfigSchema = z
  .object({
    feedUrl: z.string().url().max(1000).optional(),
    indicators: z.array(z.string().max(40)).max(20).optional(),
    country: z.string().max(3).optional(),
    dataset: z.string().max(60).optional(),
    language: z.enum(["en", "gu"]).default("en"),
    contentPolicy: z.enum(CONTENT_POLICIES).default("excerpt"),
    defaultSection: z.enum(SECTIONS).default("news"),
    // Name of an environment variable holding a key — never the key itself.
    apiKeyEnv: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{2,63}$/, "Must be an environment variable name, not a secret value")
      .optional(),
  })
  .strict();

const AccessReviewSchema = z
  .object({
    termsUrl: z.string().url().max(1000).optional(),
    license: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    termsReviewed: z.boolean().default(false),
  })
  .strict();

const sourceFields = {
  name: z.string().trim().min(3).max(160),
  baseUrl: z.string().max(1000).optional(),
  integrationConfig: IntegrationConfigSchema,
  categories: z.array(z.enum(CATEGORY_CODES)).max(CATEGORY_CODES.length),
  isEnabled: z.boolean(),
  fetchIntervalMinutes: z.number().int().min(1).max(60 * 24 * 30),
  accessReview: AccessReviewSchema,
};

export const CreateSourceSchema = z
  .object({
    ...sourceFields,
    sourceType: z.enum(SOURCE_TYPES),
    categories: sourceFields.categories.default([]),
    isEnabled: sourceFields.isEnabled.default(false),
    accessReview: AccessReviewSchema.default({ termsReviewed: false }),
  })
  .strict();

// No defaults here: zod's partial() would otherwise fill omitted fields with
// their defaults and a PATCH of one field would silently reset the others.
export const UpdateSourceSchema = z.object(sourceFields).partial().strict();

/**
 * Validates a source configuration against the allowlist and its adapter
 * rules. Returns normalised fields ready to persist.
 */
export function validateSourceConfig(
  input: z.infer<typeof CreateSourceSchema>,
  actorEmail: string,
  previous?: { termsReviewed?: boolean | null; reviewedBy?: string | null; reviewedAt?: Date | null },
) {
  let baseUrl: string;
  if (input.sourceType === "sample") baseUrl = SAMPLE_BASE_URL;
  else if (input.sourceType === "worldbank") baseUrl = WORLD_BANK_BASE_URL;
  else {
    if (!input.baseUrl) throw new ApiError(400, "baseUrl is required");
    baseUrl = validateSourceUrl(input.baseUrl).url.origin;
  }

  const candidate = {
    _id: new Types.ObjectId(),
    name: input.name,
    sourceType: input.sourceType,
    baseUrl,
    categories: input.categories,
    isSample: input.sourceType === "sample",
    integrationConfig: input.integrationConfig,
  } satisfies SourceLike;

  const adapter = getAdapter(input.sourceType);
  try {
    adapter.validateConfig(candidate);
  } catch (err) {
    throw new ApiError(400, (err as Error).message);
  }
  if (input.sourceType === "rss") {
    const feedHost = new URL(input.integrationConfig.feedUrl!).hostname;
    if (validateSourceUrl(baseUrl).approved.domain !== validateSourceUrl(`https://${feedHost}/`).approved.domain) {
      throw new ApiError(400, "The feed URL must belong to the same approved organisation as the base URL");
    }
  }

  const floor = adapter.minIntervalMinutes(candidate);
  if (input.fetchIntervalMinutes < floor) {
    throw new ApiError(400, `Fetch interval must be at least ${floor} minutes for this source`);
  }
  if (input.isEnabled && !candidate.isSample && !input.accessReview.termsReviewed) {
    throw new ApiError(400, "Confirm the source's terms of use have been reviewed before enabling it");
  }

  const nowReviewed = input.accessReview.termsReviewed && !previous?.termsReviewed;
  return {
    name: input.name,
    sourceType: input.sourceType,
    baseUrl,
    integrationConfig: input.integrationConfig,
    categories: input.categories,
    isEnabled: input.isEnabled,
    isSample: candidate.isSample,
    fetchIntervalMinutes: input.fetchIntervalMinutes,
    accessReview: {
      ...input.accessReview,
      reviewedBy: nowReviewed ? actorEmail : (previous?.reviewedBy ?? undefined),
      reviewedAt: nowReviewed ? new Date() : (previous?.reviewedAt ?? undefined),
    },
  };
}

type SourceLean = DataSourceDoc & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date };

export function freshness(source: SourceLean, now = Date.now()): "fresh" | "stale" | "never" {
  if (!source.lastSuccessfulFetchAt) return "never";
  const age = now - source.lastSuccessfulFetchAt.getTime();
  return age <= source.fetchIntervalMinutes * 2 * 60_000 + 5 * 60_000 ? "fresh" : "stale";
}

/** Source list with freshness, review counts and recent sync quality for the dashboard. */
export async function listSourcesWithStats() {
  const sources = await DataSource.find().sort({ createdAt: 1 }).lean<SourceLean[]>();
  const ids = sources.map((s) => s._id);
  const [itemCounts, jobs] = await Promise.all([
    ImportedItem.aggregate<{ _id: { sourceId: Types.ObjectId; status: string }; n: number }>([
      { $match: { sourceId: { $in: ids } } },
      { $group: { _id: { sourceId: "$sourceId", status: "$reviewStatus" }, n: { $sum: 1 } } },
    ]),
    SyncJob.aggregate<{ _id: Types.ObjectId; total: number; failed: number; duplicate: number; fetched: number }>([
      { $match: { sourceId: { $in: ids }, status: { $in: ["succeeded", "partial", "failed"] } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$sourceId",
          jobs: { $push: { status: "$status", dup: "$itemsDuplicate", fetched: "$itemsFetched" } },
        },
      },
      { $project: { recent: { $slice: ["$jobs", 10] } } },
      {
        $project: {
          total: { $size: "$recent" },
          failed: { $size: { $filter: { input: "$recent", cond: { $eq: ["$$this.status", "failed"] } } } },
          duplicate: { $sum: "$recent.dup" },
          fetched: { $sum: "$recent.fetched" },
        },
      },
    ]),
  ]);

  return sources.map((s) => {
    const counts: Record<string, number> = {};
    for (const c of itemCounts) if (String(c._id.sourceId) === String(s._id)) counts[c._id.status] = c.n;
    const q = jobs.find((j) => String(j._id) === String(s._id));
    let floor: number | null = null;
    try {
      floor = getAdapter(s.sourceType).minIntervalMinutes(s as unknown as SourceLike);
    } catch {
      floor = null;
    }
    return {
      ...s,
      _id: String(s._id),
      syncLock: undefined,
      isSyncing: Boolean(s.syncLock?.lockedUntil && s.syncLock.lockedUntil > new Date()),
      freshness: freshness(s),
      minIntervalMinutes: floor,
      itemCounts: counts,
      quality: q
        ? {
            recentJobs: q.total,
            failureRate: q.total ? Math.round((q.failed / q.total) * 100) : 0,
            duplicateRate: q.fetched ? Math.round((q.duplicate / q.fetched) * 100) : 0,
          }
        : null,
    };
  });
}
