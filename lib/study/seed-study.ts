import type { Actor } from "@/lib/audit";
import { Chapter, Note, Quiz } from "@/lib/models/study";
import { SAMPLE_CHAPTERS, SAMPLE_TEST } from "./sample-content";

/** Adds the starter chapters, notes and quizzes. Safe to run repeatedly. */
export async function seedStudyContent(actor: Actor) {
  const created: string[] = [];
  for (const sample of SAMPLE_CHAPTERS) {
    if (await Chapter.exists({ classLevel: sample.classLevel, "title.en": sample.title.en })) continue;
    const chapter = await Chapter.create({
      classLevel: sample.classLevel,
      boards: [],
      order: sample.order,
      title: sample.title,
      description: sample.description,
      isPublished: true,
      updatedBy: actor.email,
    });
    await Note.insertMany(
      sample.notes.map((n, i) => ({ chapterId: chapter._id, order: i + 1, title: n.title, body: n.body, isPublished: true, updatedBy: actor.email })),
    );
    await Quiz.create({
      kind: "practice",
      chapterId: chapter._id,
      classLevel: sample.classLevel,
      boards: [],
      order: 1,
      title: sample.quiz.title,
      questions: sample.quiz.questions,
      isPublished: true,
      updatedBy: actor.email,
    });
    created.push(sample.title.en);
  }

  if (!(await Quiz.exists({ kind: "test", "title.en": SAMPLE_TEST.title.en }))) {
    await Quiz.create({ kind: "test", boards: [], order: 1, isPublished: true, updatedBy: actor.email, ...SAMPLE_TEST });
    created.push(SAMPLE_TEST.title.en);
  }
  return created;
}
