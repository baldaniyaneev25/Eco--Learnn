import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { markNoteRead } from "@/lib/study/student";

export const POST = handle(async (req, ctx: RouteContext<"/api/study/notes/[id]/read">) => {
  const user = await requireRole(req, ANY_USER);
  return privateJson(await markNoteRead(user, (await ctx.params).id));
});
