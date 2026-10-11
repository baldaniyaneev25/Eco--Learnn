import type { QueryFilter } from "mongoose";
import { handle, paged, pagination, privateJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { EconomicIndicator, type EconomicIndicatorDoc } from "@/lib/models/EconomicIndicator";

export const GET = handle(async (req) => {
  await requireRole(req, STAFF);
  const p = req.nextUrl.searchParams;
  const { page, limit, skip } = pagination(req, 200);
  const filter: QueryFilter<EconomicIndicatorDoc> = {};
  const verified = p.get("verified");
  if (verified === "true" || verified === "false") filter.isVerified = verified === "true";
  if (p.get("history") !== "true") filter.isLatest = true;
  const code = p.get("code");
  if (code && /^[A-Za-z0-9._-]{1,60}$/.test(code)) filter.indicatorCode = code;

  const [items, total] = await Promise.all([
    EconomicIndicator.find(filter).sort({ indicatorCode: 1, referencePeriod: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    EconomicIndicator.countDocuments(filter),
  ]);
  return privateJson(paged(items, total, page, limit));
});
