import { handle, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { adminSaveNote, NoteInput } from "@/lib/study/admin";

export const POST = handle(async (req) => {
  const user = await requireRole(req, STAFF);
  const input = await readJson(req, NoteInput);
  return privateJson({ item: await adminSaveNote(null, input, user) }, { status: 201 });
});
