import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { listAttempts } from "@/lib/study/student";

export const GET = handle(async (req) => {
  const user = await requireRole(req, ANY_USER);
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
  return privateJson({ items: await listAttempts(user, limit) });
});
