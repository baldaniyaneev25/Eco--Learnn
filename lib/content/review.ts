import { z } from "zod";
import { CATEGORY_CODES, DIFFICULTIES, SECTIONS } from "@/config/categories";
import { audit, type Actor } from "@/lib/audit";
import { ImportedItem } from "@/lib/models/ImportedItem";
import { Translation } from "@/lib/models/Translation";

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const publicationFields = {
  section: z.enum(SECTIONS),
  title: z.string().trim().min(3).max(300),
  summary: z.string().trim().min(20).max(2000),
  category: z.enum(CATEGORY_CODES),
  classLevels: z.array(z.string().max(10)).max(10).default([]),
  boards: z.array(z.string().max(20)).max(10).default([]),
  difficulty: z.enum(DIFFICULTIES).optional(),
};

export const ReviewActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    ...publicationFields,
    factChecked: z.boolean().default(false),
    academicReviewed: z.boolean().default(false),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("edit"),
    ...publicationFields,
    note: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3).max(1000) }),
  z.object({ action: z.literal("archive"), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("rollback"), version: z.number().int().positive() }),
]);

export type ReviewAction = z.infer<typeof ReviewActionSchema>;

/**
 * Copyright safeguard: the student-facing summary must be the editor's own
 * words, not a long verbatim passage from the source.
 */
export function looksCopied(summary: string, originalText: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const a = norm(summary);
  const b = norm(originalText);
  if (a.length < 80 || !b) return false;
  // Any 80-character window of the summary appearing verbatim in the source.
  for (let i = 0; i + 80 <= a.length; i += 20) {
    if (b.includes(a.slice(i, i + 80))) return true;
  }
  return false;
}

export async function applyReview(itemId: string, input: ReviewAction, actor: Actor) {
  const item = await ImportedItem.findById(itemId);
  if (!item) throw new ReviewError("Imported item not found", 404);
  const now = new Date();
  const history = item.publicationHistory ?? [];
  const nextVersion = history.length + 1;
  const pushVersion = (action: string, note?: string) =>
    item.publicationHistory.push({
      version: nextVersion,
      action,
      snapshot: item.publication ? JSON.parse(JSON.stringify(item.publication)) : undefined,
      reviewStatus: item.reviewStatus,
      editedBy: actor.email,
      editedAt: now,
      note,
    });

  switch (input.action) {
    case "approve":
    case "edit": {
      if (input.action === "edit" && item.reviewStatus !== "approved") {
        throw new ReviewError("Only approved items can be edited; approve the item first");
      }
      if (input.action === "approve") {
        if (item.flags?.needsFactCheck && !input.factChecked) {
          throw new ReviewError("This item contains figures: confirm they were fact-checked against the source");
        }
        if (input.section === "learning-resource" && !input.academicReviewed) {
          throw new ReviewError("Learning resources need academic review confirmation");
        }
      }
      if (looksCopied(input.summary, item.originalText ?? "")) {
        throw new ReviewError("The summary copies the source text. Write an original summary and link to the source.");
      }
      item.publication = {
        section: input.section,
        title: input.title,
        summary: input.summary,
        category: input.category,
        classLevels: input.classLevels,
        boards: input.boards,
        difficulty: input.difficulty,
      };
      item.category = input.category;
      if (input.action === "approve") {
        item.reviewStatus = "approved";
        item.reviewedBy = actor.email;
        item.reviewedAt = now;
        item.rejectionReason = undefined;
        item.publishedToStudentsAt ??= now;
        item.set("flags.needsFactCheck", false);
        if (input.section === "learning-resource") item.set("flags.needsAcademicReview", false);
      }
      item.set("flags.sourceUpdatedAfterReview", false);
      pushVersion(input.action, input.note);
      break;
    }
    case "reject":
      if (item.reviewStatus === "rejected") throw new ReviewError("Item is already rejected");
      item.reviewStatus = "rejected";
      item.rejectionReason = input.reason;
      item.reviewedBy = actor.email;
      item.reviewedAt = now;
      pushVersion("reject", input.reason);
      break;
    case "archive":
      if (item.reviewStatus === "archived") throw new ReviewError("Item is already archived");
      item.reviewStatus = "archived";
      item.reviewedBy = actor.email;
      item.reviewedAt = now;
      pushVersion("archive", input.note);
      break;
    case "rollback": {
      const target = history.find((h) => h.version === input.version);
      if (!target?.snapshot) throw new ReviewError("That version has no publication to restore");
      item.publication = JSON.parse(JSON.stringify(target.snapshot));
      item.reviewStatus = "approved";
      item.reviewedBy = actor.email;
      item.reviewedAt = now;
      item.publishedToStudentsAt ??= now;
      pushVersion("rollback", `Restored version ${input.version}`);
      break;
    }
  }

  await item.save();
  await audit(actor, `item.${input.action}`, "importedItem", itemId, `${input.action} "${item.title}"`, {
    version: nextVersion,
    reviewStatus: item.reviewStatus,
  });
  return item;
}

export const TranslationInputSchema = z.object({
  language: z.enum(["en", "gu"]),
  translatedTitle: z.string().trim().min(1).max(300),
  translatedSummary: z.string().trim().max(2000).default(""),
  reviewStatus: z.enum(["draft", "approved", "rejected"]).default("draft"),
});

export async function saveTranslation(itemId: string, input: z.infer<typeof TranslationInputSchema>, actor: Actor) {
  const item = await ImportedItem.findById(itemId).select("originalLanguage title");
  if (!item) throw new ReviewError("Imported item not found", 404);
  if (input.language === item.originalLanguage) {
    throw new ReviewError("A translation must be in a different language from the original");
  }
  const existing = await Translation.findOne({ importedItemId: item._id, language: input.language });
  const method = existing && existing.translationMethod !== "human" ? "machine-edited" : "human";
  const translation = await Translation.findOneAndUpdate(
    { importedItemId: item._id, language: input.language },
    {
      $set: {
        translatedTitle: input.translatedTitle,
        translatedSummary: input.translatedSummary,
        translationMethod: method,
        reviewStatus: input.reviewStatus,
        reviewedBy: actor.email,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  await audit(actor, "translation.save", "importedItem", itemId, `Saved ${input.language} translation (${input.reviewStatus})`, {
    method,
  });
  return translation;
}
