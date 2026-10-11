import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const SYNC_STATUSES = ["queued", "running", "succeeded", "partial", "failed", "skipped"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

const SyncJobSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId, ref: "DataSource", required: true, index: true },
    sourceName: String,
    trigger: { type: String, enum: ["scheduled", "manual", "retry"], required: true },
    triggeredBy: String,
    retryOf: { type: Schema.Types.ObjectId },
    queuedAt: { type: Date, default: () => new Date() },
    startedAt: Date,
    finishedAt: Date,
    status: { type: String, enum: SYNC_STATUSES, default: "queued", index: true },
    attempts: { type: Number, default: 0 },
    itemsFetched: { type: Number, default: 0 },
    itemsCreated: { type: Number, default: 0 },
    itemsUpdated: { type: Number, default: 0 },
    itemsSkipped: { type: Number, default: 0 },
    itemsDuplicate: { type: Number, default: 0 },
    itemsFailed: { type: Number, default: 0 },
    errorSummary: String,
    retryable: { type: Boolean, default: false },
    recordErrors: [{ externalId: String, message: String, _id: false }],
  },
  { timestamps: true },
);

SyncJobSchema.index({ createdAt: -1 });

export type SyncJobDoc = InferSchemaType<typeof SyncJobSchema>;
export const SyncJob: Model<SyncJobDoc> =
  (models.SyncJob as Model<SyncJobDoc>) ?? model<SyncJobDoc>("SyncJob", SyncJobSchema, "syncJobs");
