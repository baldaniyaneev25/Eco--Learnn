import { handle, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { adminListQuizzes, adminSaveQuiz, QuizInput } from "@/lib/study/admin";

// ?kind=practice|test&class=12&chapterId=
export const GET = handle(async (req) => {
  await requireRole(req, STAFF);
  const p = req.nextUrl.searchParams;
  return privateJson({
    items: await adminListQuizzes({ kind: p.get("kind") ?? undefined, classLevel: p.get("class") ?? undefined, chapterId: p.get("chapterId") ?? undefined }),
  });
});

export const POST = handle(async (req) => {
  const user = await requireRole(req, STAFF);
  const input = await readJson(req, QuizInput);
  return privateJson({ item: await adminSaveQuiz(null, input, user) }, { status: 201 });
});
