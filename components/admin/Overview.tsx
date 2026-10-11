"use client";

import Link from "next/link";
import { api, formatDate } from "@/lib/client/api";
import { Card, ErrorBox, useAsync } from "./ui";

interface OverviewData {
  pending: number;
  flagged: number;
  unverifiedIndicators: number;
  failedJobs24h: number;
  alerts: { _id: string; name: string; consecutiveFailures: number; lastError?: string }[];
  lastSuccess: { sourceName: string; finishedAt: string; status: string } | null;
  approvedDomains: { domain: string; organisation: string; notes: string; minIntervalMinutes?: number; maxContentPolicy?: string }[];
  translationProvider: string;
}

function Stat({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-emerald-600">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-stone-600">{label}</p>
    </Link>
  );
}

export function Overview() {
  const { data, error } = useAsync(() => api<OverviewData>("/api/admin/overview"), []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <ErrorBox error={error} />
      {data?.alerts.map((a) => (
        <div key={a._id} role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <strong>Integration alert:</strong> “{a.name}” has failed {a.consecutiveFailures} consecutive syncs. {a.lastError}{" "}
          <Link href="/admin/web-data/jobs" className="underline">
            View jobs
          </Link>
        </div>
      ))}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Items awaiting review" value={data.pending} href="/admin/web-data/review" />
            <Stat label="Changed at source after review" value={data.flagged} href="/admin/web-data/review" />
            <Stat label="Unverified indicator values" value={data.unverifiedIndicators} href="/admin/web-data/indicators" />
            <Stat label="Failed syncs (24h)" value={data.failedJobs24h} href="/admin/web-data/jobs" />
          </div>
          <Card title="Latest successful synchronisation">
            {data.lastSuccess ? (
              <p className="text-sm">
                {data.lastSuccess.sourceName} — {formatDate(data.lastSuccess.finishedAt, "en", true)} ({data.lastSuccess.status})
              </p>
            ) : (
              <p className="text-sm text-stone-500">No successful sync yet.</p>
            )}
            <p className="mt-2 text-xs text-stone-500">
              Translation provider: <strong>{data.translationProvider}</strong>
              {data.translationProvider === "none" && " — translations are entered by editors."}
            </p>
          </Card>
          <Card title="Approved source domains (allowlist)">
            <p className="mb-2 text-xs text-stone-500">
              Sources can only be configured on these domains. Adding a domain is a deployment change (config/approved-sources.ts or
              ALLOWED_SOURCE_DOMAINS) made after reviewing its terms of use.
            </p>
            <ul className="space-y-2 text-sm">
              {data.approvedDomains.map((d) => (
                <li key={d.domain}>
                  <strong>{d.domain}</strong> — {d.organisation}
                  {d.minIntervalMinutes && <span className="text-stone-500"> · min interval {d.minIntervalMinutes} min</span>}
                  {d.maxContentPolicy && <span className="text-stone-500"> · max storage: {d.maxContentPolicy}</span>}
                  <p className="text-xs text-stone-500">{d.notes}</p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
