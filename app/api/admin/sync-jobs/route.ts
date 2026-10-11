import type { QueryFilter } from "mongoose";
import { handle, objectId, paged, pagination, privateJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { SYNC_STATUSES, SyncJob, type SyncJobDoc } from "@/lib/models/SyncJob";

export const GET = handle(async (req) => {
  await requireRole(req, STAFF);
  const p = req.nextUrl.searchParams;
  const { page, limit, skip } = pagination(req, 100);
  const filter: QueryFilter<SyncJobDoc> = {};
  const sourceId = p.get("sourceId");
  if (sourceId) filter.sourceId = objectId.parse(sourceId);
  const status = p.get("status");
  if (status && (SYNC_STATUSES as readonly string[]).includes(status)) filter.status = status as SyncJobDoc["status"];

  const [items, total] = await Promise.all([
    SyncJob.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SyncJob.countDocuments(filter),
  ]);
  return privateJson(paged(items, total, page, limit));
});
