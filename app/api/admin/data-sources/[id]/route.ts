import { UpdateSourceSchema, validateSourceConfig } from "@/lib/admin/sources";
import { ApiError, handle, objectId, privateJson, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ADMIN_ONLY, requireRole, STAFF } from "@/lib/auth/guard";
import { DataSource } from "@/lib/models/DataSource";
import { SyncJob } from "@/lib/models/SyncJob";
import type { CreateSourceSchema } from "@/lib/admin/sources";
import type { z } from "zod";

export const GET = handle(async (req, ctx: RouteContext<"/api/admin/data-sources/[id]">) => {
  await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const source = await DataSource.findById(id).lean();
  if (!source) throw new ApiError(404, "Data source not found");
  const jobs = await SyncJob.find({ sourceId: id }).sort({ createdAt: -1 }).limit(20).lean();
  return privateJson({ item: source, jobs });
});

export const PATCH = handle(async (req, ctx: RouteContext<"/api/admin/data-sources/[id]">) => {
  const user = await requireRole(req, ADMIN_ONLY);
  const id = objectId.parse((await ctx.params).id);
  const patch = await readJson(req, UpdateSourceSchema);
  const source = await DataSource.findById(id);
  if (!source) throw new ApiError(404, "Data source not found");

  const current = source.toObject();
  // Re-validate the merged configuration as a whole.
  const merged = {
    name: patch.name ?? current.name,
    sourceType: current.sourceType,
    baseUrl: patch.baseUrl ?? current.baseUrl,
    integrationConfig: patch.integrationConfig ?? current.integrationConfig,
    categories: patch.categories ?? current.categories,
    isEnabled: patch.isEnabled ?? current.isEnabled,
    fetchIntervalMinutes: patch.fetchIntervalMinutes ?? current.fetchIntervalMinutes,
    accessReview: patch.accessReview ?? {
      termsUrl: current.accessReview?.termsUrl ?? undefined,
      license: current.accessReview?.license ?? undefined,
      notes: current.accessReview?.notes ?? undefined,
      termsReviewed: current.accessReview?.termsReviewed ?? false,
    },
  } as z.infer<typeof CreateSourceSchema>;
  const fields = validateSourceConfig(merged, user.email, current.accessReview ?? undefined);

  const wasEnabled = source.isEnabled;
  source.set(fields);
  if (!wasEnabled && fields.isEnabled) {
    source.nextRunAt = new Date();
    source.alertActive = false;
    source.consecutiveFailures = 0;
  }
  await source.save();

  const action = wasEnabled === fields.isEnabled ? "source.update" : fields.isEnabled ? "source.enable" : "source.disable";
  await audit(user, action, "dataSource", id, `${action.split(".")[1]} source "${source.name}"`, {
    changed: Object.keys(patch),
  });
  return privateJson({ item: source.toObject() });
});
