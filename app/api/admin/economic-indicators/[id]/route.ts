import { z } from "zod";
import { ApiError, handle, objectId, privateJson, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { EconomicIndicator, REVISION_STATUSES } from "@/lib/models/EconomicIndicator";

const PatchSchema = z
  .object({
    isVerified: z.boolean().optional(),
    revisionStatus: z.enum(REVISION_STATUSES).optional(),
  })
  .strict();

// Editors verify values against the source before they appear on the student dashboard.
export const PATCH = handle(async (req, ctx: RouteContext<"/api/admin/economic-indicators/[id]">) => {
  const user = await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const patch = await readJson(req, PatchSchema);
  const indicator = await EconomicIndicator.findById(id);
  if (!indicator) throw new ApiError(404, "Indicator value not found");

  if (patch.revisionStatus) indicator.revisionStatus = patch.revisionStatus;
  if (patch.isVerified !== undefined) {
    indicator.isVerified = patch.isVerified;
    indicator.verifiedBy = patch.isVerified ? user.email : undefined;
    indicator.verifiedAt = patch.isVerified ? new Date() : undefined;
  }
  await indicator.save();
  await audit(
    user,
    patch.isVerified === false ? "indicator.unverify" : patch.isVerified ? "indicator.verify" : "indicator.update",
    "economicIndicator",
    id,
    `${indicator.indicatorCode} ${indicator.referencePeriod} = ${indicator.value} ${indicator.unit}`,
    patch,
  );
  return privateJson({ item: indicator.toObject() });
});
