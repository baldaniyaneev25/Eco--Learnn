import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { getNote } from "@/lib/study/student";

export const GET = handle(async (req, ctx: RouteContext<"/api/study/notes/[id]">) => {
  const user = await requireRole(req, ANY_USER);
  return privateJson(await getNote(user, (await ctx.params).id));
});
