import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Study content (chapters, notes, quizzes) and student progress.
// Text fields are bilingual: { en, gu }; at least one language is filled in.

const Bilingual = {
  en: { type: String, default: "" },
  gu: { type: String, default: "" },
};

const ChapterSchema = new Schema(
  {
    classLevel: { type: String, required: true, index: true },
    /** Boards this chapter applies to; empty = all boards. */
    boards: [String],
    order: { type: Number, default: 0 },
    title: Bilingual,
    description: Bilingual,
    isPublished: { type: Boolean, default: false, index: true },
    updatedBy: String,
  },
  { timestamps: true },
);
ChapterSchema.index({ classLevel: 1, order: 1 });

const NoteSchema = new Schema(
  {
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", required: true, index: true },
    order: { type: Number, default: 0 },
    title: Bilingual,
    body: Bilingual,
    /** Optional link to a PDF version (https). */
    pdfUrl: Bilingual,
    isPublished: { type: Boolean, default: false },
    updatedBy: String,
  },
  { timestamps: true },
);

const QuestionSchema = new Schema({
  text: Bilingual,
  options: [{ en: { type: String, default: "" }, gu: { type: String, default: "" }, _id: false }],
  correctIndex: { type: Number, required: true },
  explanation: Bilingual,
});

export const QUIZ_KINDS = ["practice", "test"] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

const QuizSchema = new Schema(
  {
    kind: { type: String, enum: QUIZ_KINDS, required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", index: true },
    classLevel: { type: String, required: true, index: true },
    boards: [String],
    order: { type: Number, default: 0 },
    title: Bilingual,
    description: Bilingual,
    /** Time limit for tests; practice quizzes are untimed. */
    durationMinutes: Number,
    questions: [QuestionSchema],
    isPublished: { type: Boolean, default: false, index: true },
    updatedBy: String,
  },
  { timestamps: true },
);

export const ATTEMPT_STATUSES = ["in-progress", "submitted", "expired", "abandoned"] as const;

const QuizAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter" },
    kind: { type: String, enum: QUIZ_KINDS, required: true },
    quizTitle: Bilingual,
    status: { type: String, enum: ATTEMPT_STATUSES, default: "in-progress", index: true },
    startedAt: { type: Date, required: true },
    deadlineAt: Date,
    submittedAt: Date,
    /** Question ids and answer key captured at start, so later quiz edits don't change grading. */
    questionIds: [Schema.Types.ObjectId],
    answerKey: { type: [Number], select: false },
    /** Chosen option index per question, or null when unanswered. */
    answers: { type: [Schema.Types.Mixed], default: [] },
    score: Number,
    total: Number,
    percent: Number,
  },
  { timestamps: true },
);
QuizAttemptSchema.index({ userId: 1, quizId: 1, status: 1 });
QuizAttemptSchema.index({ userId: 1, submittedAt: -1 });

const NoteReadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    noteId: { type: Schema.Types.ObjectId, ref: "Note", required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", required: true },
    readAt: { type: Date, required: true },
  },
  { timestamps: false },
);
NoteReadSchema.index({ userId: 1, noteId: 1 }, { unique: true });
NoteReadSchema.index({ userId: 1, chapterId: 1 });

export type ChapterDoc = InferSchemaType<typeof ChapterSchema>;
export type NoteDoc = InferSchemaType<typeof NoteSchema>;
export type QuizDoc = InferSchemaType<typeof QuizSchema>;
export type QuizAttemptDoc = InferSchemaType<typeof QuizAttemptSchema>;
export type NoteReadDoc = InferSchemaType<typeof NoteReadSchema>;

export const Chapter: Model<ChapterDoc> = (models.Chapter as Model<ChapterDoc>) ?? model<ChapterDoc>("Chapter", ChapterSchema, "chapters");
export const Note: Model<NoteDoc> = (models.Note as Model<NoteDoc>) ?? model<NoteDoc>("Note", NoteSchema, "notes");
export const Quiz: Model<QuizDoc> = (models.Quiz as Model<QuizDoc>) ?? model<QuizDoc>("Quiz", QuizSchema, "quizzes");
export const QuizAttempt: Model<QuizAttemptDoc> =
  (models.QuizAttempt as Model<QuizAttemptDoc>) ?? model<QuizAttemptDoc>("QuizAttempt", QuizAttemptSchema, "quizAttempts");
export const NoteRead: Model<NoteReadDoc> =
  (models.NoteRead as Model<NoteReadDoc>) ?? model<NoteReadDoc>("NoteRead", NoteReadSchema, "noteReads");
