import { handle, objectId, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { adminDeleteNote, adminGetNote, adminSaveNote, NoteInput } from "@/lib/study/admin";

type Ctx = RouteContext<"/api/admin/study/notes/[id]">;

export const GET = handle(async (req, ctx: Ctx) => {
  await requireRole(req, STAFF);
  return privateJson({ item: await adminGetNote(objectId.parse((await ctx.params).id)) });
});

export const PUT = handle(async (req, ctx: Ctx) => {
  const user = await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const input = await readJson(req, NoteInput);
  return privateJson({ item: await adminSaveNote(id, input, user) });
});

export const DELETE = handle(async (req, ctx: Ctx) => {
  const user = await requireRole(req, STAFF);
  await adminDeleteNote(objectId.parse((await ctx.params).id), user);
  return privateJson({ ok: true });
});
