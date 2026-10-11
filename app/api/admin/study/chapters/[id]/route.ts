import { handle, objectId, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { adminDeleteChapter, adminGetChapter, adminSaveChapter, ChapterInput } from "@/lib/study/admin";

type Ctx = RouteContext<"/api/admin/study/chapters/[id]">;

export const GET = handle(async (req, ctx: Ctx) => {
  await requireRole(req, STAFF);
  return privateJson(await adminGetChapter(objectId.parse((await ctx.params).id)));
});

export const PUT = handle(async (req, ctx: Ctx) => {
  const user = await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const input = await readJson(req, ChapterInput);
  return privateJson({ item: await adminSaveChapter(id, input, user) });
});

export const DELETE = handle(async (req, ctx: Ctx) => {
  const user = await requireRole(req, STAFF);
  await adminDeleteChapter(objectId.parse((await ctx.params).id), user);
  return privateJson({ ok: true });
});
