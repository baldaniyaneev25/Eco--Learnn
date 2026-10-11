import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { listChapters } from "@/lib/study/student";

// Chapters for the signed-in student's board and class.
export const GET = handle(async (req) => {
  const user = await requireRole(req, ANY_USER);
  return privateJson({ items: await listChapters(user) });
});
