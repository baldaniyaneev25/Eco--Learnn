import { Types } from "mongoose";
import { z } from "zod";
import { BOARDS, CLASS_LEVELS } from "@/config/categories";
import { audit, type Actor } from "@/lib/audit";
import { Chapter, Note, Quiz, QuizAttempt, QUIZ_KINDS } from "@/lib/models/study";
import { StudyError } from "./student";

// ---------- Validation ----------

const text = (max: number) => z.string().trim().max(max).default("");
const bilingual = (max: number) => z.object({ en: text(max), gu: text(max) }).strict();
/** Bilingual text where at least one language must be filled in. */
const requiredBilingual = (max: number) =>
  bilingual(max).refine((v) => v.en.length > 0 || v.gu.length > 0, { message: "Enter the text in English or Gujarati" });

const httpsUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), { message: "Must be an https:// link" })
  .default("");

const boards = z.array(z.enum(BOARDS)).max(BOARDS.length).default([]);

export const ChapterInput = z
  .object({
    classLevel: z.enum(CLASS_LEVELS),
    boards,
    order: z.number().int().min(0).max(1000).default(0),
    title: requiredBilingual(200),
    description: bilingual(1000).default({ en: "", gu: "" }),
    isPublished: z.boolean().default(false),
  })
  .strict();

export const NoteInput = z
  .object({
    chapterId: z.string().regex(/^[a-f0-9]{24}$/i),
    order: z.number().int().min(0).max(1000).default(0),
    title: requiredBilingual(200),
    body: requiredBilingual(50_000),
    pdfUrl: z.object({ en: httpsUrl, gu: httpsUrl }).strict().default({ en: "", gu: "" }),
    isPublished: z.boolean().default(false),
  })
  .strict();

const QuestionInput = z
  .object({
    _id: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
    text: requiredBilingual(1000),
    options: z.array(requiredBilingual(300)).min(2, "At least 2 options").max(6, "At most 6 options"),
    correctIndex: z.number().int().min(0),
    explanation: bilingual(2000).default({ en: "", gu: "" }),
  })
  .strict()
  .refine((q) => q.correctIndex < q.options.length, { message: "Choose which option is correct", path: ["correctIndex"] });

export const QuizInput = z
  .object({
    kind: z.enum(QUIZ_KINDS),
    chapterId: z.string().regex(/^[a-f0-9]{24}$/i).nullable().default(null),
    classLevel: z.enum(CLASS_LEVELS),
    boards,
    order: z.number().int().min(0).max(1000).default(0),
    title: requiredBilingual(200),
    description: bilingual(1000).default({ en: "", gu: "" }),
    durationMinutes: z.number().int().min(1).max(300).nullable().default(null),
    questions: z.array(QuestionInput).max(200).default([]),
    isPublished: z.boolean().default(false),
  })
  .strict()
  .refine((q) => q.kind !== "test" || q.durationMinutes, { message: "Tests need a time limit", path: ["durationMinutes"] })
  .refine((q) => !q.isPublished || q.questions.length > 0, { message: "Add at least one question before publishing", path: ["questions"] });

// ---------- Chapters ----------

export async function adminListChapters(classLevel?: string) {
  const filter = classLevel ? { classLevel } : {};
  const chapters = await Chapter.find(filter).sort({ classLevel: 1, order: 1, createdAt: 1 }).lean();
  const ids = chapters.map((c) => c._id);
  const [notes, quizzes] = await Promise.all([
    Note.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { chapterId: { $in: ids } } }, { $group: { _id: "$chapterId", n: { $sum: 1 } } }]),
    Quiz.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { chapterId: { $in: ids } } }, { $group: { _id: "$chapterId", n: { $sum: 1 } } }]),
  ]);
  const n = (list: { _id: Types.ObjectId; n: number }[], id: Types.ObjectId) => list.find((x) => String(x._id) === String(id))?.n ?? 0;
  return chapters.map((c) => ({ ...c, _id: String(c._id), noteCount: n(notes, c._id), quizCount: n(quizzes, c._id) }));
}

export async function adminGetChapter(id: string) {
  const chapter = await Chapter.findById(id).lean();
  if (!chapter) throw new StudyError(404, "Chapter not found");
  const [notes, quizzes] = await Promise.all([
    Note.find({ chapterId: id }).sort({ order: 1, createdAt: 1 }).select("title order isPublished updatedAt").lean(),
    Quiz.find({ chapterId: id }).sort({ order: 1, createdAt: 1 }).select("title kind order isPublished durationMinutes questions._id updatedAt").lean(),
  ]);
  return {
    chapter,
    notes,
    quizzes: quizzes.map(({ questions, ...q }) => ({ ...q, questionCount: questions.length })),
  };
}

export async function adminSaveChapter(id: string | null, input: z.infer<typeof ChapterInput>, actor: Actor) {
  const doc = id ? await Chapter.findById(id) : new Chapter();
  if (!doc) throw new StudyError(404, "Chapter not found");
  doc.set({ ...input, updatedBy: actor.email });
  await doc.save();
  // Practice quizzes of a chapter follow its class.
  if (id) await Quiz.updateMany({ chapterId: doc._id }, { $set: { classLevel: input.classLevel } });
  await audit(actor, id ? "study.chapter.update" : "study.chapter.create", "chapter", String(doc._id), `Chapter "${input.title.en || input.title.gu}"`, {
    isPublished: input.isPublished,
  });
  return doc.toObject();
}

export async function adminDeleteChapter(id: string, actor: Actor) {
  const [notes, quizzes] = await Promise.all([Note.countDocuments({ chapterId: id }), Quiz.countDocuments({ chapterId: id })]);
  if (notes || quizzes) throw new StudyError(409, "Delete or move this chapter's notes and quizzes first");
  const doc = await Chapter.findByIdAndDelete(id);
  if (!doc) throw new StudyError(404, "Chapter not found");
  await audit(actor, "study.chapter.delete", "chapter", id, `Deleted chapter "${doc.title?.en || doc.title?.gu}"`);
}

// ---------- Notes ----------

export async function adminGetNote(id: string) {
  const note = await Note.findById(id).lean();
  if (!note) throw new StudyError(404, "Note not found");
  return note;
}

export async function adminSaveNote(id: string | null, input: z.infer<typeof NoteInput>, actor: Actor) {
  if (!(await Chapter.exists({ _id: input.chapterId }))) throw new StudyError(400, "Chapter does not exist");
  const doc = id ? await Note.findById(id) : new Note();
  if (!doc) throw new StudyError(404, "Note not found");
  doc.set({ ...input, chapterId: new Types.ObjectId(input.chapterId), updatedBy: actor.email });
  await doc.save();
  await audit(actor, id ? "study.note.update" : "study.note.create", "note", String(doc._id), `Note "${input.title.en || input.title.gu}"`, {
    chapterId: input.chapterId,
    isPublished: input.isPublished,
  });
  return doc.toObject();
}

export async function adminDeleteNote(id: string, actor: Actor) {
  const doc = await Note.findByIdAndDelete(id);
  if (!doc) throw new StudyError(404, "Note not found");
  await audit(actor, "study.note.delete", "note", id, `Deleted note "${doc.title?.en || doc.title?.gu}"`);
}

// ---------- Quizzes ----------

export async function adminListQuizzes(filter: { kind?: string; classLevel?: string; chapterId?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.kind && (QUIZ_KINDS as readonly string[]).includes(filter.kind)) query.kind = filter.kind;
  if (filter.classLevel) query.classLevel = filter.classLevel;
  if (filter.chapterId && Types.ObjectId.isValid(filter.chapterId)) query.chapterId = new Types.ObjectId(filter.chapterId);
  const quizzes = await Quiz.find(query).sort({ classLevel: 1, kind: -1, order: 1, createdAt: 1 }).lean();
  const stats = await QuizAttempt.aggregate<{ _id: Types.ObjectId; attempts: number; avg: number }>([
    { $match: { quizId: { $in: quizzes.map((q) => q._id) }, status: { $in: ["submitted", "expired"] } } },
    { $group: { _id: "$quizId", attempts: { $sum: 1 }, avg: { $avg: "$percent" } } },
  ]);
  const chapterTitles = new Map(
    (await Chapter.find({ _id: { $in: quizzes.map((q) => q.chapterId).filter(Boolean) } }).select("title").lean()).map((c) => [String(c._id), c.title]),
  );
  return quizzes.map(({ questions, ...q }) => {
    const s = stats.find((x) => String(x._id) === String(q._id));
    return {
      ...q,
      _id: String(q._id),
      chapterTitle: q.chapterId ? (chapterTitles.get(String(q.chapterId)) ?? null) : null,
      questionCount: questions.length,
      attempts: s?.attempts ?? 0,
      averagePercent: s ? Math.round(s.avg) : null,
    };
  });
}

export async function adminGetQuiz(id: string) {
  const quiz = await Quiz.findById(id).lean();
  if (!quiz) throw new StudyError(404, "Quiz not found");
  return quiz;
}

export async function adminSaveQuiz(id: string | null, input: z.infer<typeof QuizInput>, actor: Actor) {
  let classLevel = input.classLevel;
  let quizBoards = input.boards;
  if (input.chapterId) {
    const chapter = await Chapter.findById(input.chapterId).select("classLevel boards").lean();
    if (!chapter) throw new StudyError(400, "Chapter does not exist");
    classLevel = chapter.classLevel as typeof classLevel;
    if (quizBoards.length === 0) quizBoards = (chapter.boards ?? []) as typeof quizBoards;
  }
  const doc = id ? await Quiz.findById(id) : new Quiz();
  if (!doc) throw new StudyError(404, "Quiz not found");
  doc.set({
    ...input,
    classLevel,
    boards: quizBoards,
    chapterId: input.chapterId ? new Types.ObjectId(input.chapterId) : undefined,
    durationMinutes: input.kind === "test" ? input.durationMinutes : undefined,
    // Keep question ids stable so in-progress attempts can still be reviewed.
    questions: input.questions.map(({ _id, ...q }) => ({ ...q, _id: _id ? new Types.ObjectId(_id) : new Types.ObjectId() })),
    updatedBy: actor.email,
  });
  await doc.save();
  await audit(actor, id ? "study.quiz.update" : "study.quiz.create", "quiz", String(doc._id), `${input.kind === "test" ? "Test" : "Quiz"} "${input.title.en || input.title.gu}"`, {
    questions: input.questions.length,
    isPublished: input.isPublished,
  });
  return doc.toObject();
}

export async function adminDeleteQuiz(id: string, actor: Actor) {
  if (await QuizAttempt.exists({ quizId: id })) {
    throw new StudyError(409, "Students have attempted this quiz. Unpublish it instead of deleting, so their results are kept.");
  }
  const doc = await Quiz.findByIdAndDelete(id);
  if (!doc) throw new StudyError(404, "Quiz not found");
  await audit(actor, "study.quiz.delete", "quiz", id, `Deleted quiz "${doc.title?.en || doc.title?.gu}"`);
}
