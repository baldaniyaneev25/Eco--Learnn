import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Translations live apart from the original source content. Machine output
// starts as a draft and is only shown to students once an editor approves it.
const TranslationSchema = new Schema(
  {
    importedItemId: { type: Schema.Types.ObjectId, ref: "ImportedItem", required: true },
    language: { type: String, enum: ["en", "gu"], required: true },
    translatedTitle: { type: String, required: true },
    translatedSummary: { type: String, default: "" },
    translationMethod: { type: String, enum: ["machine", "human", "machine-edited"], required: true },
    reviewStatus: { type: String, enum: ["draft", "approved", "rejected"], default: "draft" },
    reviewedBy: String,
    provider: String,
  },
  { timestamps: true },
);

TranslationSchema.index({ importedItemId: 1, language: 1 }, { unique: true });

export type TranslationDoc = InferSchemaType<typeof TranslationSchema>;
export const Translation: Model<TranslationDoc> =
  (models.Translation as Model<TranslationDoc>) ??
  model<TranslationDoc>("Translation", TranslationSchema, "translations");
