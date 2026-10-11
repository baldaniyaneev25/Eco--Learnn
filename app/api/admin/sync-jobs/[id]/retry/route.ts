import { after } from "next/server";
import { ApiError, handle, objectId, privateJson } from "@/lib/api";
import { ADMIN_ONLY, requireRole } from "@/lib/auth/guard";
import { enqueueSync, runJob } from "@/lib/ingestion/sync";
import { SyncJob } from "@/lib/models/SyncJob";

export const maxDuration = 60;

// Retries a failed or partial job, still subject to the source's permitted
// fetch interval and the no-concurrent-sync rule.
export const POST = handle(async (req, ctx: RouteContext<"/api/admin/sync-jobs/[id]/retry">) => {
  const user = await requireRole(req, ADMIN_ONLY);
  const id = objectId.parse((await ctx.params).id);
  const failed = await SyncJob.findById(id);
  if (!failed) throw new ApiError(404, "Sync job not found");
  if (!["failed", "partial"].includes(failed.status) || !failed.retryable) {
    throw new ApiError(409, "Only failed or partial jobs marked retryable can be retried");
  }
  const { job, existing } = await enqueueSync(String(failed.sourceId), { trigger: "retry", actor: user, retryOf: id });
  if (!existing) {
    failed.retryable = false;
    await failed.save();
    after(async () => {
      try {
        await runJob(String(job._id));
      } catch (err) {
        console.error("[sync] retry job failed", err);
      }
    });
  }
  return privateJson({ job: job.toObject(), existing }, { status: 202 });
});
