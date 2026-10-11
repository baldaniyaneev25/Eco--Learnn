import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { getAttemptResult } from "@/lib/study/student";

// Result with correct answers once submitted; the questions again while still in progress.
export const GET = handle(async (req, ctx: RouteContext<"/api/study/attempts/[id]">) => {
  const user = await requireRole(req, ANY_USER);
  return privateJson(await getAttemptResult(user, (await ctx.params).id));
});
