import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { getChapter } from "@/lib/study/student";

export const GET = handle(async (req, ctx: RouteContext<"/api/study/chapters/[id]">) => {
  const user = await requireRole(req, ANY_USER);
  return privateJson(await getChapter(user, (await ctx.params).id));
});
