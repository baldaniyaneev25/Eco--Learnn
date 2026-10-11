import { handle, privateJson, readJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { adminListChapters, adminSaveChapter, ChapterInput } from "@/lib/study/admin";

export const GET = handle(async (req) => {
  await requireRole(req, STAFF);
  const classLevel = req.nextUrl.searchParams.get("class") ?? undefined;
  return privateJson({ items: await adminListChapters(classLevel) });
});

export const POST = handle(async (req) => {
  const user = await requireRole(req, STAFF);
  const input = await readJson(req, ChapterInput);
  return privateJson({ item: await adminSaveChapter(null, input, user) }, { status: 201 });
});
