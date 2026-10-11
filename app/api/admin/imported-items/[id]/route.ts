import { ApiError, handle, objectId, privateJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { ContentAuditLog } from "@/lib/models/ContentAuditLog";
import { DataSource } from "@/lib/models/DataSource";
import { ImportedItem } from "@/lib/models/ImportedItem";
import { Translation } from "@/lib/models/Translation";

// Full detail for review: original text, provenance, translations and history.
export const GET = handle(async (req, ctx: RouteContext<"/api/admin/imported-items/[id]">) => {
  await requireRole(req, STAFF);
  const id = objectId.parse((await ctx.params).id);
  const item = await ImportedItem.findById(id).lean();
  if (!item) throw new ApiError(404, "Imported item not found");
  const [source, translations, auditLog] = await Promise.all([
    DataSource.findById(item.sourceId).select("name sourceType baseUrl integrationConfig.contentPolicy accessReview isSample").lean(),
    Translation.find({ importedItemId: id }).lean(),
    ContentAuditLog.find({ entityId: id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  return privateJson({ item, source, translations, auditLog });
});
