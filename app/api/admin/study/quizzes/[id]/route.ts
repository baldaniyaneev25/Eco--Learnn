import { handle, objectId, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { adminDeleteQuiz, adminGetQuiz, adminSaveQuiz, QuizInput } from "@/lib/study/admin";

type Ctx = RouteContext<"/api/admin/study/quizzes/[id]">;

// Includes correct answers: staff only.
export const GET = handle(async (req, ctx: Ctx) => {
  await requireRole(req, STAFF);
  return privateJson({ item: await adminGetQuiz(objectId.parse((await ctx.params).id)) });
});

export const PUT = handle(async (req, ctx: Ctx) => {
  const user = await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const input = await readJson(req, QuizInput);
  return privateJson({ item: await adminSaveQuiz(id, input, user) });
});

export const DELETE = handle(async (req, ctx: Ctx) => {
  const user = await requireRole(req, STAFF);
  await adminDeleteQuiz(objectId.parse((await ctx.params).id), user);
  return privateJson({ ok: true });
});
