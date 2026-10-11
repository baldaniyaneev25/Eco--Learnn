import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { startAttempt } from "@/lib/study/student";

// Starts (or resumes) an attempt. Questions are returned without answers.
export const POST = handle(async (req, ctx: RouteContext<"/api/study/quizzes/[id]/attempts">) => {
  const user = await requireRole(req, ANY_USER);
  return privateJson(await startAttempt(user, (await ctx.params).id), { status: 201 });
});
