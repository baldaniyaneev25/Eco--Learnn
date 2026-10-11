import crypto from "node:crypto";
import { ApiError, handle, privateJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { runDueSyncs } from "@/lib/ingestion/sync";

// Scheduler entry point for platform cron services (e.g. Vercel Cron, GitHub
// Actions, cron-job.org). Each call runs one bounded tick; the long-running
// alternative is `npm run worker`.
export const maxDuration = 60;

function authorized(header: string | null): boolean {
  const secret = env.cronSecret;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export const GET = handle(async (req) => {
  if (!authorized(req.headers.get("authorization"))) throw new ApiError(401, "Unauthorized");
  await connectDB();
  const summary = await runDueSyncs({ budgetMs: 45_000 });
  return privateJson({ ok: true, ...summary });
});
