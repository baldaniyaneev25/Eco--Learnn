import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDB, disconnectDB } from "@/lib/db";
import { Chapter, Note, Quiz, QuizAttempt } from "@/lib/models/study";
import { adminDeleteChapter, adminDeleteQuiz, adminSaveQuiz, QuizInput } from "@/lib/study/admin";
import { seedStudyContent } from "@/lib/study/seed-study";
import {
  getAttemptResult,
  getChapter,
  getDashboard,
  getNote,
  listChapters,
  listQuizzes,
  markNoteRead,
  startAttempt,
  submitAttempt,
  StudyError,
  SUBMIT_GRACE_SECONDS,
} from "@/lib/study/student";

let mongo: MongoMemoryServer;
const actor = { email: "editor@test" };
const student12 = { id: new Types.ObjectId().toString(), board: "GSEB", classLevel: "12" };
const student11 = { id: new Types.ObjectId().toString(), board: "CBSE", classLevel: "11" };
const T0 = new Date("2026-10-01T10:00:00Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri("ecolearn-study-test"));
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  await Promise.all(["chapters", "notes", "quizzes", "quizAttempts", "noteReads", "contentAuditLogs"].map((c) => mongoose.connection.collection(c).deleteMany({})));
  await seedStudyContent(actor);
});

async function practiceQuizFor(classLevel: string, user = student12) {
  const quizzes = await listQuizzes(user, "practice");
  const chapter = await Chapter.findOne({ classLevel, "title.en": "National Income" });
  return quizzes.find((q) => q.chapterId === String(chapter?._id))!;
}

describe("content visibility", () => {
  it("shows only published chapters for the student's class and board", async () => {
    expect((await listChapters(student12)).map((c) => c.title.en)).toEqual(["National Income", "Money and Banking"]);
    expect((await listChapters(student11)).map((c) => c.title.en)).toEqual(["Introduction to Economics"]);

    await Chapter.updateOne({ "title.en": "Money and Banking" }, { $set: { boards: ["CBSE"] } });
    expect((await listChapters(student12)).map((c) => c.title.en)).toEqual(["National Income"]);

    await Chapter.updateOne({ "title.en": "National Income" }, { $set: { isPublished: false } });
    expect(await listChapters(student12)).toHaveLength(0);
  });

  it("tracks read notes and navigates between them", async () => {
    const [chapter] = await listChapters(student12);
    expect(chapter).toMatchObject({ notesTotal: 2, notesRead: 0, quizzes: 1 });

    const detail = await getChapter(student12, chapter.id);
    const first = await getNote(student12, detail.notes[0].id);
    expect(first).toMatchObject({ read: false, previousId: null, nextId: detail.notes[1].id });
    expect(first.body.gu.length).toBeGreaterThan(50);

    await markNoteRead(student12, first.id, T0);
    await markNoteRead(student12, first.id, at(60)); // idempotent
    expect((await listChapters(student12))[0].notesRead).toBe(1);
    expect((await getNote(student12, first.id)).read).toBe(true);

    await expect(getNote(student11, first.id)).rejects.toThrow(StudyError); // other class
    await expect(getNote(student12, "not-an-id")).rejects.toThrow(/not found/i);
  });
});

describe("quiz attempts", () => {
  it("never sends answers before submission, then grades on the server", async () => {
    const quiz = await practiceQuizFor("12");
    const started = await startAttempt(student12, quiz.id, T0);
    const json = JSON.stringify(started);
    expect(json).not.toMatch(/correctIndex|explanation|answerKey/);
    expect(started.questions).toHaveLength(5);
    expect(started.deadlineAt).toBeNull();

    // All National Income sample answers are option 0 except question 4 (index 3).
    const answers = [0, 0, 0, 3, null];
    const result = await submitAttempt(student12, started.attemptId, answers, at(120));
    expect(result).toMatchObject({ status: "submitted", score: 4, total: 5, percent: 80 });
    if (!("review" in result) || !result.review) throw new Error("expected review");
    expect(result.review[4]).toMatchObject({ chosen: null, correctIndex: 0, isCorrect: false });
    expect(result.review[0].explanation.en).toMatch(/NFIA|net factor income/i);

    // Re-submitting returns the same result and cannot change the score.
    const again = await submitAttempt(student12, started.attemptId, [1, 1, 1, 1, 1], at(130));
    expect(again).toMatchObject({ score: 4 });
  });

  it("rejects wrong answer counts and other students' attempts", async () => {
    const quiz = await practiceQuizFor("12");
    const { attemptId } = await startAttempt(student12, quiz.id, T0);
    await expect(submitAttempt(student12, attemptId, [0, 0], T0)).rejects.toThrow(/Expected 5 answers/);
    const other = { ...student12, id: new Types.ObjectId().toString() };
    await expect(submitAttempt(other, attemptId, [0, 0, 0, 0, 0], T0)).rejects.toThrow(/not found/i);
    await expect(startAttempt(student11, quiz.id, T0)).rejects.toThrow(/not found/i);
  });

  it("restarting a practice quiz abandons the unfinished attempt", async () => {
    const quiz = await practiceQuizFor("12");
    const first = await startAttempt(student12, quiz.id, T0);
    const second = await startAttempt(student12, quiz.id, at(30));
    expect(second.attemptId).not.toBe(first.attemptId);
    expect((await QuizAttempt.findById(first.attemptId))?.status).toBe("abandoned");
  });

  it("resumes a running test with the same deadline and refuses late answers", async () => {
    const [test] = await listQuizzes(student12, "test");
    expect(test).toMatchObject({ kind: "test", durationMinutes: 15, questionCount: 10 });

    const started = await startAttempt(student12, test.id, T0);
    expect(new Date(started.deadlineAt!).getTime()).toBe(at(15 * 60).getTime());

    const resumed = await startAttempt(student12, test.id, at(300));
    expect(resumed.attemptId).toBe(started.attemptId);
    expect(new Date(resumed.deadlineAt!).getTime()).toBe(at(15 * 60).getTime());

    const late = await submitAttempt(student12, started.attemptId, Array(10).fill(0), at(15 * 60 + SUBMIT_GRACE_SECONDS + 1));
    expect(late).toMatchObject({ status: "expired", score: 0, percent: 0 });

    const fresh = await startAttempt(student12, test.id, at(20 * 60));
    expect(fresh.attemptId).not.toBe(started.attemptId);
    const ok = await submitAttempt(student12, fresh.attemptId, [0, 0, 0, 3, 0, 0, 0, 0, 0, 0], at(20 * 60 + 600));
    expect(ok).toMatchObject({ status: "submitted", score: 10, percent: 100 });
  });

  it("an expired test left open is closed when the student starts again", async () => {
    const [test] = await listQuizzes(student12, "test");
    const started = await startAttempt(student12, test.id, T0);
    await startAttempt(student12, test.id, at(60 * 60));
    const old = await getAttemptResult(student12, started.attemptId);
    expect(old).toMatchObject({ status: "expired", score: 0 });
  });
});

describe("dashboard", () => {
  it("summarises reading, scores and weak chapters", async () => {
    const chapters = await listChapters(student12);
    const detail = await getChapter(student12, chapters[0].id);
    await markNoteRead(student12, detail.notes[0].id, T0);

    const quiz = await practiceQuizFor("12");
    const { attemptId } = await startAttempt(student12, quiz.id, T0);
    await submitAttempt(student12, attemptId, [1, 1, 1, 1, 0], at(60)); // 1/5 = 20%

    const dash = await getDashboard(student12);
    expect(dash.totals).toMatchObject({ chapters: 2, notesTotal: 4, notesRead: 1, quizzesTaken: 1, testsTaken: 0, averagePercent: 20 });
    expect(dash.continueChapter?.title.en).toBe("National Income");
    expect(dash.weakChapters.map((c) => c.title.en)).toEqual(["National Income"]);
    expect(dash.recentAttempts[0]).toMatchObject({ percent: 20, kind: "practice" });
  });
});

describe("admin content rules", () => {
  const base = {
    kind: "practice",
    classLevel: "12",
    title: { en: "New quiz", gu: "" },
    questions: [{ text: { en: "Q?", gu: "" }, options: [{ en: "A", gu: "" }, { en: "B", gu: "" }], correctIndex: 1 }],
  };

  it("validates quizzes", () => {
    expect(QuizInput.safeParse(base).success).toBe(true);
    expect(QuizInput.safeParse({ ...base, questions: [{ ...base.questions[0], correctIndex: 5 }] }).success).toBe(false);
    expect(QuizInput.safeParse({ ...base, kind: "test" }).success).toBe(false); // no time limit
    expect(QuizInput.safeParse({ ...base, questions: [], isPublished: true }).success).toBe(false);
    expect(QuizInput.safeParse({ ...base, title: { en: "", gu: "" } }).success).toBe(false);
  });

  it("chapter quizzes follow the chapter's class; content with results is protected", async () => {
    const chapter11 = await Chapter.findOne({ classLevel: "11" });
    const saved = await adminSaveQuiz(null, QuizInput.parse({ ...base, chapterId: String(chapter11!._id) }), actor);
    expect(saved.classLevel).toBe("11");

    await expect(adminDeleteChapter(String(chapter11!._id), actor)).rejects.toThrow(/notes and quizzes first/);

    const quiz = await practiceQuizFor("12");
    const { attemptId } = await startAttempt(student12, quiz.id, T0);
    await submitAttempt(student12, attemptId, [0, 0, 0, 0, 0], at(10));
    await expect(adminDeleteQuiz(quiz.id, actor)).rejects.toThrow(/Unpublish it instead/);

    await adminDeleteQuiz(String(saved._id), actor);
    expect(await Quiz.exists({ _id: saved._id })).toBeNull();
    expect(await Note.countDocuments()).toBe(6);
  });
});
