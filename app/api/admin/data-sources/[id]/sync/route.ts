import { after } from "next/server";
import { handle, objectId, privateJson } from "@/lib/api";
import { ADMIN_ONLY, requireRole } from "@/lib/auth/guard";
import { enqueueSync, runJob } from "@/lib/ingestion/sync";

// The job is queued in MongoDB and processed after the response is sent.
// If this invocation ends before it finishes, the worker / cron tick picks up
// the queued job or recovers it as stale — nothing relies on the request
// handler living indefinitely.
export const maxDuration = 60;

export const POST = handle(async (req, ctx: RouteContext<"/api/admin/data-sources/[id]/sync">) => {
  const user = await requireRole(req, ADMIN_ONLY);
  const id = objectId.parse((await ctx.params).id);
  const { job, existing } = await enqueueSync(id, { trigger: "manual", actor: user });
  if (!existing) {
    after(async () => {
      try {
        await runJob(String(job._id));
      } catch (err) {
        console.error("[sync] manual job failed", err);
      }
    });
  }
  return privateJson({ job: job.toObject(), existing }, { status: 202 });
});
