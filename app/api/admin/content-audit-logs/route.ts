import type { QueryFilter } from "mongoose";
import { escapeRegex, handle, paged, pagination, privateJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { ContentAuditLog, type ContentAuditLogDoc } from "@/lib/models/ContentAuditLog";

export const GET = handle(async (req) => {
  await requireRole(req, STAFF);
  const p = req.nextUrl.searchParams;
  const { page, limit, skip } = pagination(req, 100);
  const filter: QueryFilter<ContentAuditLogDoc> = {};
  const entityId = p.get("entityId");
  if (entityId && /^[a-f0-9]{24}$/i.test(entityId)) filter.entityId = entityId;
  const action = p.get("action");
  if (action && /^[a-z.]{1,40}$/.test(action)) filter.action = new RegExp(`^${escapeRegex(action)}`);
  const actor = p.get("actor");
  if (actor) filter.actorEmail = actor.slice(0, 200);

  const [items, total] = await Promise.all([
    ContentAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContentAuditLog.countDocuments(filter),
  ]);
  return privateJson(paged(items, total, page, limit));
});
