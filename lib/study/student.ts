import { Types, type QueryFilter } from "mongoose";
import {
  Chapter,
  Note,
  NoteRead,
  Quiz,
  QuizAttempt,
  type ChapterDoc,
  type QuizDoc,
  type QuizKind,
} from "@/lib/models/study";

export class StudyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Learner {
  id: string;
  board: string;
  classLevel: string;
}

/** Seconds of network slack accepted after a test's deadline. */
export const SUBMIT_GRACE_SECONDS = 60;

type Bi = { en?: string | null; gu?: string | null };
const bi = (v: Bi | null | undefined) => ({ en: v?.en ?? "", gu: v?.gu ?? "" });

function oid(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new StudyError(404, "Not found");
  return new Types.ObjectId(id);
}

/** Published content for the learner's class and board (empty boards = every board). */
function visibleTo<T extends ChapterDoc | QuizDoc>(user: Learner): QueryFilter<T> {
  return {
    isPublished: true,
    classLevel: user.classLevel,
    $or: [{ boards: { $size: 0 } }, { boards: user.board }],
  } as QueryFilter<T>;
}

async function visibleChapter(user: Learner, id: Types.ObjectId) {
  const chapter = await Chapter.findOne({ _id: id, ...visibleTo<ChapterDoc>(user) }).lean();
  if (!chapter) throw new StudyError(404, "Chapter not found");
  return chapter;
}

// ---------- Chapters & notes ----------

export async function listChapters(user: Learner) {
  const chapters = await Chapter.find(visibleTo<ChapterDoc>(user)).sort({ order: 1, createdAt: 1 }).lean();
  const ids = chapters.map((c) => c._id);
  const userId = oid(user.id);
  const [noteCounts, readCounts, quizCounts] = await Promise.all([
    Note.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { chapterId: { $in: ids }, isPublished: true } },
      { $group: { _id: "$chapterId", n: { $sum: 1 } } },
    ]),
    NoteRead.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { userId, chapterId: { $in: ids } } },
      { $lookup: { from: "notes", localField: "noteId", foreignField: "_id", as: "note" } },
      { $match: { "note.isPublished": true } },
      { $group: { _id: "$chapterId", n: { $sum: 1 } } },
    ]),
    Quiz.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { chapterId: { $in: ids }, isPublished: true } },
      { $group: { _id: "$chapterId", n: { $sum: 1 } } },
    ]),
  ]);
  const count = (list: { _id: Types.ObjectId; n: number }[], id: Types.ObjectId) =>
    list.find((x) => String(x._id) === String(id))?.n ?? 0;

  return chapters.map((c) => ({
    id: String(c._id),
    order: c.order,
    title: bi(c.title),
    description: bi(c.description),
    notesTotal: count(noteCounts, c._id),
    notesRead: count(readCounts, c._id),
    quizzes: count(quizCounts, c._id),
  }));
}

export async function getChapter(user: Learner, chapterId: string) {
  const chapter = await visibleChapter(user, oid(chapterId));
  const userId = oid(user.id);
  const [notes, quizzes] = await Promise.all([
    Note.find({ chapterId: chapter._id, isPublished: true }).sort({ order: 1, createdAt: 1 }).select("title order pdfUrl").lean(),
    Quiz.find({ chapterId: chapter._id, ...visibleTo<QuizDoc>(user) }).sort({ order: 1, createdAt: 1 }).lean(),
  ]);
  const reads = await NoteRead.find({ userId, noteId: { $in: notes.map((n) => n._id) } }).select("noteId").lean();
  const readSet = new Set(reads.map((r) => String(r.noteId)));
  const best = await bestScores(userId, quizzes.map((q) => q._id));

  return {
    id: String(chapter._id),
    title: bi(chapter.title),
    description: bi(chapter.description),
    notes: notes.map((n) => ({ id: String(n._id), title: bi(n.title), hasPdf: Boolean(n.pdfUrl?.en || n.pdfUrl?.gu), read: readSet.has(String(n._id)) })),
    quizzes: quizzes.map((q) => quizSummary(q, best.get(String(q._id)))),
  };
}

export async function getNote(user: Learner, noteId: string) {
  const note = await Note.findOne({ _id: oid(noteId), isPublished: true }).lean();
  if (!note) throw new StudyError(404, "Note not found");
  const chapter = await visibleChapter(user, note.chapterId);
  const siblings = await Note.find({ chapterId: chapter._id, isPublished: true }).sort({ order: 1, createdAt: 1 }).select("_id").lean();
  const index = siblings.findIndex((s) => String(s._id) === String(note._id));
  const read = await NoteRead.exists({ userId: oid(user.id), noteId: note._id });
  return {
    id: String(note._id),
    chapter: { id: String(chapter._id), title: bi(chapter.title) },
    title: bi(note.title),
    body: bi(note.body),
    pdfUrl: bi(note.pdfUrl),
    read: Boolean(read),
    previousId: index > 0 ? String(siblings[index - 1]._id) : null,
    nextId: index >= 0 && index < siblings.length - 1 ? String(siblings[index + 1]._id) : null,
  };
}

export async function markNoteRead(user: Learner, noteId: string, now = new Date()) {
  const note = await Note.findOne({ _id: oid(noteId), isPublished: true }).select("chapterId").lean();
  if (!note) throw new StudyError(404, "Note not found");
  await visibleChapter(user, note.chapterId);
  await NoteRead.updateOne(
    { userId: oid(user.id), noteId: note._id },
    { $setOnInsert: { chapterId: note.chapterId, readAt: now } },
    { upsert: true },
  );
  return { read: true };
}

// ---------- Quizzes ----------

type QuizLean = QuizDoc & { _id: Types.ObjectId };

async function bestScores(userId: Types.ObjectId, quizIds: Types.ObjectId[]) {
  const rows = await QuizAttempt.aggregate<{ _id: Types.ObjectId; best: number; attempts: number }>([
    { $match: { userId, quizId: { $in: quizIds }, status: { $in: ["submitted", "expired"] } } },
    { $group: { _id: "$quizId", best: { $max: "$percent" }, attempts: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { best: r.best, attempts: r.attempts }]));
}

function quizSummary(q: QuizLean, stats?: { best: number; attempts: number }) {
  return {
    id: String(q._id),
    kind: q.kind,
    chapterId: q.chapterId ? String(q.chapterId) : null,
    title: bi(q.title),
    description: bi(q.description),
    questionCount: q.questions.length,
    durationMinutes: q.kind === "test" ? (q.durationMinutes ?? null) : null,
    bestPercent: stats?.best ?? null,
    attempts: stats?.attempts ?? 0,
  };
}

export async function listQuizzes(user: Learner, kind?: QuizKind) {
  const filter: QueryFilter<QuizDoc> = { ...visibleTo<QuizDoc>(user), "questions.0": { $exists: true } };
  if (kind) filter.kind = kind;
  const quizzes = await Quiz.find(filter).sort({ kind: -1, order: 1, createdAt: 1 }).lean<QuizLean[]>();
  const best = await bestScores(oid(user.id), quizzes.map((q) => q._id));
  return quizzes.map((q) => quizSummary(q, best.get(String(q._id))));
}

/** Questions as sent to the app: never includes the correct answer or explanation. */
function publicQuestions(quiz: QuizLean, ids?: Types.ObjectId[]) {
  const byId = new Map(quiz.questions.map((q) => [String(q._id), q]));
  const ordered = ids ? ids.map((id) => byId.get(String(id))) : quiz.questions;
  return ordered.map((q, i) => ({
    id: q ? String(q._id) : `removed-${i}`,
    text: bi(q?.text ?? { en: "(This question was removed)", gu: "(આ પ્રશ્ન દૂર કરાયો છે)" }),
    options: (q?.options ?? []).map(bi),
  }));
}

function attemptStartView(attempt: { _id: unknown; deadlineAt?: Date | null; startedAt: Date; questionIds: Types.ObjectId[] }, quiz: QuizLean, now: Date) {
  return {
    attemptId: String(attempt._id),
    quiz: quizSummary(quiz),
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt ?? null,
    serverNow: now,
    questions: publicQuestions(quiz, attempt.questionIds),
  };
}

/**
 * Starts (or resumes) an attempt. A running test is resumed with its original
 * deadline, so restarting the app never resets the clock.
 */
export async function startAttempt(user: Learner, quizId: string, now = new Date()) {
  const quiz = await Quiz.findOne({ _id: oid(quizId), ...visibleTo<QuizDoc>(user) }).lean<QuizLean>();
  if (!quiz) throw new StudyError(404, "Quiz not found");
  if (quiz.questions.length === 0) throw new StudyError(409, "This quiz has no questions yet");
  const userId = oid(user.id);

  const running = await QuizAttempt.findOne({ userId, quizId: quiz._id, status: "in-progress" });
  if (running) {
    const graceEnd = running.deadlineAt ? running.deadlineAt.getTime() + SUBMIT_GRACE_SECONDS * 1000 : null;
    if (running.kind === "test" && graceEnd && graceEnd > now.getTime()) {
      return attemptStartView(running, quiz, now);
    }
    running.status = running.kind === "test" ? "expired" : "abandoned";
    if (running.status === "expired") {
      running.score = 0;
      running.total = running.questionIds.length;
      running.percent = 0;
      running.submittedAt = running.deadlineAt ?? now;
    }
    await running.save();
  }

  if (quiz.kind === "test" && !quiz.durationMinutes) throw new StudyError(409, "This test has no time limit configured");
  const attempt = await QuizAttempt.create({
    userId,
    quizId: quiz._id,
    chapterId: quiz.chapterId,
    kind: quiz.kind,
    quizTitle: bi(quiz.title),
    status: "in-progress",
    startedAt: now,
    deadlineAt: quiz.kind === "test" ? new Date(now.getTime() + quiz.durationMinutes! * 60_000) : undefined,
    questionIds: quiz.questions.map((q) => q._id),
    answerKey: quiz.questions.map((q) => q.correctIndex),
    answers: quiz.questions.map(() => null),
  });
  return attemptStartView(attempt, quiz, now);
}

export async function submitAttempt(user: Learner, attemptId: string, answers: (number | null)[], now = new Date()) {
  const attempt = await QuizAttempt.findOne({ _id: oid(attemptId), userId: oid(user.id) }).select("+answerKey");
  if (!attempt) throw new StudyError(404, "Attempt not found");
  if (attempt.status !== "in-progress") return getAttemptResult(user, attemptId);

  const total = attempt.questionIds.length;
  if (answers.length !== total) throw new StudyError(400, `Expected ${total} answers`);

  const late = attempt.deadlineAt && now.getTime() > attempt.deadlineAt.getTime() + SUBMIT_GRACE_SECONDS * 1000;
  const key = attempt.answerKey ?? [];
  // Answers sent after the deadline (plus grace) are not accepted.
  const accepted = late ? answers.map(() => null) : answers;
  const score = accepted.reduce<number>((sum, a, i) => sum + (a !== null && a === key[i] ? 1 : 0), 0);

  attempt.answers = accepted;
  attempt.score = score;
  attempt.total = total;
  attempt.percent = total ? Math.round((score / total) * 100) : 0;
  attempt.status = late ? "expired" : "submitted";
  attempt.submittedAt = now;
  await attempt.save();
  return getAttemptResult(user, attemptId);
}

export async function getAttemptResult(user: Learner, attemptId: string) {
  const attempt = await QuizAttempt.findOne({ _id: oid(attemptId), userId: oid(user.id) }).select("+answerKey").lean();
  if (!attempt) throw new StudyError(404, "Attempt not found");
  const quiz = await Quiz.findById(attempt.quizId).lean<QuizLean>();

  if (attempt.status === "in-progress") {
    if (!quiz) throw new StudyError(404, "Quiz not found");
    return { status: attempt.status, ...attemptStartView(attempt, quiz, new Date()) };
  }

  const byId = new Map((quiz?.questions ?? []).map((q) => [String(q._id), q]));
  return {
    status: attempt.status,
    attemptId: String(attempt._id),
    quizId: String(attempt.quizId),
    kind: attempt.kind,
    title: bi(attempt.quizTitle),
    score: attempt.score ?? 0,
    total: attempt.total ?? attempt.questionIds.length,
    percent: attempt.percent ?? 0,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    review: attempt.questionIds.map((qid, i) => {
      const q = byId.get(String(qid));
      const chosen = attempt.answers?.[i] ?? null;
      const correctIndex = attempt.answerKey?.[i] ?? -1;
      return {
        text: bi(q?.text ?? { en: "(This question was removed)", gu: "(આ પ્રશ્ન દૂર કરાયો છે)" }),
        options: (q?.options ?? []).map(bi),
        chosen,
        correctIndex,
        isCorrect: chosen !== null && chosen === correctIndex,
        explanation: bi(q?.explanation),
      };
    }),
  };
}

export async function listAttempts(user: Learner, limit = 20) {
  const attempts = await QuizAttempt.find({ userId: oid(user.id), status: { $in: ["submitted", "expired"] } })
    .sort({ submittedAt: -1 })
    .limit(Math.min(limit, 100))
    .lean();
  return attempts.map((a) => ({
    attemptId: String(a._id),
    quizId: String(a.quizId),
    kind: a.kind,
    title: bi(a.quizTitle),
    status: a.status,
    score: a.score ?? 0,
    total: a.total ?? 0,
    percent: a.percent ?? 0,
    submittedAt: a.submittedAt,
  }));
}

// ---------- Dashboard ----------

export async function getDashboard(user: Learner) {
  const userId = oid(user.id);
  const chapters = await listChapters(user);
  const chapterIds = chapters.map((c) => oid(c.id));

  const [finished, perChapter] = await Promise.all([
    QuizAttempt.find({ userId, status: { $in: ["submitted", "expired"] } })
      .sort({ submittedAt: -1 })
      .select("quizId kind quizTitle percent score total submittedAt status chapterId")
      .lean(),
    QuizAttempt.aggregate<{ _id: Types.ObjectId; avg: number; attempts: number }>([
      { $match: { userId, chapterId: { $in: chapterIds }, status: { $in: ["submitted", "expired"] } } },
      { $group: { _id: "$chapterId", avg: { $avg: "$percent" }, attempts: { $sum: 1 } } },
    ]),
  ]);

  const notesTotal = chapters.reduce((s, c) => s + c.notesTotal, 0);
  const notesRead = chapters.reduce((s, c) => s + c.notesRead, 0);
  const average = finished.length ? Math.round(finished.reduce((s, a) => s + (a.percent ?? 0), 0) / finished.length) : null;
  const chapterTitle = new Map(chapters.map((c) => [c.id, c.title]));

  const chapterProgress = chapters.map((c) => {
    const stats = perChapter.find((p) => String(p._id) === c.id);
    return {
      id: c.id,
      title: c.title,
      notesRead: c.notesRead,
      notesTotal: c.notesTotal,
      averagePercent: stats ? Math.round(stats.avg) : null,
      attempts: stats?.attempts ?? 0,
    };
  });

  return {
    totals: {
      chapters: chapters.length,
      notesTotal,
      notesRead,
      quizzesTaken: finished.filter((a) => a.kind === "practice").length,
      testsTaken: finished.filter((a) => a.kind === "test").length,
      averagePercent: average,
    },
    continueChapter: chapters.find((c) => c.notesRead < c.notesTotal) ?? null,
    weakChapters: chapterProgress
      .filter((c) => c.averagePercent !== null && c.averagePercent < 60)
      .sort((a, b) => (a.averagePercent ?? 0) - (b.averagePercent ?? 0))
      .slice(0, 3)
      .map((c) => ({ ...c, title: chapterTitle.get(c.id) ?? c.title })),
    chapterProgress,
    recentAttempts: finished.slice(0, 5).map((a) => ({
      attemptId: String(a._id),
      kind: a.kind,
      title: bi(a.quizTitle),
      percent: a.percent ?? 0,
      score: a.score ?? 0,
      total: a.total ?? 0,
      status: a.status,
      submittedAt: a.submittedAt,
    })),
  };
}

/** Quiz details for the start screen. Does not start an attempt (so a test's clock is not running yet). */
export async function getQuizSummary(user: Learner, quizId: string) {
  const quiz = await Quiz.findOne({ _id: oid(quizId), ...visibleTo<QuizDoc>(user) }).lean<QuizLean>();
  if (!quiz) throw new StudyError(404, "Quiz not found");
  const best = await bestScores(oid(user.id), [quiz._id]);
  const running = await QuizAttempt.exists({ userId: oid(user.id), quizId: quiz._id, status: "in-progress", kind: "test" });
  return { ...quizSummary(quiz, best.get(String(quiz._id))), hasRunningAttempt: Boolean(running) };
}
