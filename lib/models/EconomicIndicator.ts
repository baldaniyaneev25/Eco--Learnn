import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const REVISION_STATUSES = ["provisional", "estimate", "revised", "final"] as const;

// One document per published value. A revision inserts a new document and
// marks the previous one isLatest=false, so history is never overwritten.
const EconomicIndicatorSchema = new Schema(
  {
    indicatorCode: { type: String, required: true, index: true },
    name: { type: String, required: true },
    nameGu: String,
    description: String,
    descriptionGu: String,
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    referencePeriod: { type: String, required: true },
    frequency: { type: String, enum: ["monthly", "quarterly", "annual"], required: true },
    geography: { type: String, required: true, default: "India" },
    sourceId: { type: Schema.Types.ObjectId, ref: "DataSource", required: true },
    sourceName: String,
    sourceUrl: { type: String, required: true },
    releaseDate: Date,
    retrievedAt: { type: Date, required: true },
    revisionStatus: { type: String, enum: REVISION_STATUSES, default: "provisional" },
    isLatest: { type: Boolean, default: true },
    supersedes: { type: Schema.Types.ObjectId },
    isVerified: { type: Boolean, default: false },
    verifiedBy: String,
    verifiedAt: Date,
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);

EconomicIndicatorSchema.index({ indicatorCode: 1, geography: 1, referencePeriod: 1, isLatest: 1 });
// Only one current value per indicator/geography/period.
EconomicIndicatorSchema.index(
  { indicatorCode: 1, geography: 1, referencePeriod: 1 },
  { unique: true, partialFilterExpression: { isLatest: true } },
);

export type EconomicIndicatorDoc = InferSchemaType<typeof EconomicIndicatorSchema>;
export const EconomicIndicator: Model<EconomicIndicatorDoc> =
  (models.EconomicIndicator as Model<EconomicIndicatorDoc>) ??
  model<EconomicIndicatorDoc>("EconomicIndicator", EconomicIndicatorSchema, "economicIndicators");
