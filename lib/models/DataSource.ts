import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CONTENT_POLICIES, SOURCE_TYPES } from "@/config/approved-sources";
import { CATEGORY_CODES, SECTIONS } from "@/config/categories";

// Approved integration configuration. Credentials are never stored here:
// integrationConfig may name an environment variable (e.g. apiKeyEnv) but not
// hold the secret itself.
const DataSourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    baseUrl: { type: String, required: true },
    integrationConfig: {
      feedUrl: String,
      /** World Bank indicator codes, e.g. FP.CPI.TOTL.ZG */
      indicators: [String],
      country: String,
      /** Sample adapter dataset name. */
      dataset: String,
      language: { type: String, enum: ["en", "gu"], default: "en" },
      contentPolicy: { type: String, enum: CONTENT_POLICIES, default: "excerpt" },
      defaultSection: { type: String, enum: SECTIONS, default: "news" },
      apiKeyEnv: String,
    },
    categories: [{ type: String, enum: CATEGORY_CODES }],
    isEnabled: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false },
    fetchIntervalMinutes: { type: Number, required: true, min: 1 },
    accessReview: {
      termsUrl: String,
      license: String,
      notes: String,
      termsReviewed: { type: Boolean, default: false },
      reviewedBy: String,
      reviewedAt: Date,
    },
    lastFetchedAt: Date,
    lastSuccessfulFetchAt: Date,
    nextRunAt: { type: Date, index: true },
    consecutiveFailures: { type: Number, default: 0 },
    lastError: String,
    alertActive: { type: Boolean, default: false },
    /** Prevents concurrent syncs of the same source (see lib/ingestion/sync.ts). */
    syncLock: {
      jobId: { type: Schema.Types.ObjectId },
      lockedUntil: Date,
    },
  },
  { timestamps: true },
);

export type DataSourceDoc = InferSchemaType<typeof DataSourceSchema>;
export const DataSource: Model<DataSourceDoc> =
  (models.DataSource as Model<DataSourceDoc>) ?? model<DataSourceDoc>("DataSource", DataSourceSchema, "dataSources");
