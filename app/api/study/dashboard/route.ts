import { handle, privateJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { getDashboard } from "@/lib/study/student";

export const GET = handle(async (req) => {
  const user = await requireRole(req, ANY_USER);
  return privateJson(await getDashboard(user));
});
