import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CATEGORY_CODES, DIFFICULTIES, SECTIONS } from "@/config/categories";

export const REVIEW_STATUSES = ["pending", "approved", "rejected", "archived"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// What students see once an item is approved. Written by an editor, kept
// separate from the original source text.
const PublicationSchema = new Schema(
  {
    section: { type: String, enum: SECTIONS },
    title: String,
    summary: String,
    category: { type: String, enum: CATEGORY_CODES },
    classLevels: [String],
    boards: [String],
    difficulty: { type: String, enum: DIFFICULTIES },
  },
  { _id: false },
);

const PublicationVersionSchema = new Schema(
  {
    version: Number,
    action: String,
    snapshot: PublicationSchema,
    reviewStatus: String,
    editedBy: String,
    editedAt: Date,
    note: String,
  },
  { _id: false },
);

const ImportedItemSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId, ref: "DataSource", required: true, index: true },
    sourceName: String,
    externalId: { type: String, required: true },
    canonicalUrl: { type: String, required: true },
    title: { type: String, required: true },
    originalLanguage: { type: String, enum: ["en", "gu"], required: true },
    /** Stored only to the extent the source's content policy allows. */
    originalText: { type: String, default: "" },
    contentPolicy: String,
    summaryDraft: { type: String, default: "" },
    category: { type: String, enum: CATEGORY_CODES, default: "general-economy", index: true },
    relevanceScore: { type: Number, default: 0 },
    suggestedSection: { type: String, enum: SECTIONS, default: "news" },
    publishedAt: Date,
    retrievedAt: { type: Date, required: true },
    contentFingerprint: { type: String, required: true, index: true },
    flags: {
      needsTranslation: { type: Boolean, default: true },
      needsAcademicReview: { type: Boolean, default: false },
      needsFactCheck: { type: Boolean, default: false },
      sourceUpdatedAfterReview: { type: Boolean, default: false },
    },
    isSample: { type: Boolean, default: false },
    reviewStatus: { type: String, enum: REVIEW_STATUSES, default: "pending", index: true },
    reviewedBy: String,
    reviewedAt: Date,
    rejectionReason: String,
    publication: PublicationSchema,
    publishedToStudentsAt: Date,
    publicationHistory: [PublicationVersionSchema],
  },
  { timestamps: true },
);

// Duplicate prevention: one record per (source, external id) and per URL.
ImportedItemSchema.index({ sourceId: 1, externalId: 1 }, { unique: true });
ImportedItemSchema.index({ canonicalUrl: 1 }, { unique: true });
// Student-facing listing queries.
ImportedItemSchema.index({ reviewStatus: 1, "publication.section": 1, publishedAt: -1 });
ImportedItemSchema.index({ title: "text", originalText: "text", summaryDraft: "text" });

export type ImportedItemDoc = InferSchemaType<typeof ImportedItemSchema>;
export const ImportedItem: Model<ImportedItemDoc> =
  (models.ImportedItem as Model<ImportedItemDoc>) ??
  model<ImportedItemDoc>("ImportedItem", ImportedItemSchema, "importedItems");
