import { z } from "zod";
import { handle, privateJson, readJson } from "@/lib/api";
import { ANY_USER, requireRole } from "@/lib/auth/guard";
import { submitAttempt } from "@/lib/study/student";

const SubmitSchema = z.object({ answers: z.array(z.number().int().min(0).max(9).nullable()).max(200) }).strict();

export const POST = handle(async (req, ctx: RouteContext<"/api/study/attempts/[id]/submit">) => {
  const user = await requireRole(req, ANY_USER);
  const { answers } = await readJson(req, SubmitSchema);
  return privateJson(await submitAttempt(user, (await ctx.params).id, answers));
});
