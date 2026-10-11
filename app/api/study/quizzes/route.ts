import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { listQuizzes } from "@/lib/study/student";

// ?kind=practice|test
export const GET = handle(async (req) => {
  const user = await requireRole(req, ANY_USER);
  const kind = req.nextUrl.searchParams.get("kind");
  return privateJson({ items: await listQuizzes(user, kind === "practice" || kind === "test" ? kind : undefined) });
});
