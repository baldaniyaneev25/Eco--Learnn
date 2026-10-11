import { APPROVED_DOMAINS } from "@/config/approved-sources";
import { handle, privateJson } from "@/lib/api";
import { requireRole, STAFF } from "@/lib/auth/guard";
import { env } from "@/lib/env";
import { DataSource } from "@/lib/models/DataSource";
import { EconomicIndicator } from "@/lib/models/EconomicIndicator";
import { ImportedItem } from "@/lib/models/ImportedItem";
import { SyncJob } from "@/lib/models/SyncJob";

export const GET = handle(async (req) => {
  const user = await requireRole(req, STAFF);
  const [pending, flagged, unverifiedIndicators, alerts, lastSuccess, failedJobs24h] = await Promise.all([
    ImportedItem.countDocuments({ reviewStatus: "pending" }),
    ImportedItem.countDocuments({ "flags.sourceUpdatedAfterReview": true }),
    EconomicIndicator.countDocuments({ isLatest: true, isVerified: false }),
    DataSource.find({ alertActive: true }).select("name consecutiveFailures lastError").lean(),
    SyncJob.findOne({ status: { $in: ["succeeded", "partial"] } }).sort({ finishedAt: -1 }).select("sourceName finishedAt status").lean(),
    SyncJob.countDocuments({ status: "failed", createdAt: { $gte: new Date(Date.now() - 86_400_000) } }),
  ]);
  return privateJson({
    user: { name: user.name, email: user.email, role: user.role },
    pending,
    flagged,
    unverifiedIndicators,
    alerts,
    lastSuccess,
    failedJobs24h,
    approvedDomains: [
      ...APPROVED_DOMAINS,
      ...env.extraAllowedDomains.map((domain) => ({ domain, organisation: domain, notes: "From ALLOWED_SOURCE_DOMAINS" })),
    ],
    translationProvider: env.translationProvider,
  });
});
