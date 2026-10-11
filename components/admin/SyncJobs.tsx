"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, formatDate, type Paged } from "@/lib/client/api";
import { useStaff } from "./AdminShell";
import { Button, ErrorBox, inputClass, Notice, Pager, StatusBadge, useAsync } from "./ui";

interface JobRow {
  _id: string;
  sourceId: string;
  sourceName: string;
  trigger: string;
  triggeredBy: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: string;
  attempts: number;
  itemsFetched: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsDuplicate: number;
  itemsFailed: number;
  errorSummary?: string;
  retryable: boolean;
  recordErrors: { externalId: string; message: string }[];
}

function duration(job: JobRow) {
  if (!job.startedAt || !job.finishedAt) return "—";
  return `${((new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1)}s`;
}

export function SyncJobs() {
  const params = useSearchParams();
  const sourceId = params.get("sourceId") ?? "";
  const isAdmin = useStaff().role === "admin";
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, reload } = useAsync(() => {
    const p = new URLSearchParams({ page: String(page), limit: "25" });
    if (status) p.set("status", status);
    if (sourceId) p.set("sourceId", sourceId);
    return api<Paged<JobRow>>(`/api/admin/sync-jobs?${p}`);
  }, [status, page, sourceId]);

  async function retry(id: string) {
    setActionError(null);
    try {
      await api(`/api/admin/sync-jobs/${id}/retry`, { method: "POST" });
      setMessage("Retry queued.");
      setTimeout(reload, 2500);
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Web Data Manager · Sync jobs</h1>
        <select
          className={`${inputClass} w-auto`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {["queued", "running", "succeeded", "partial", "failed", "skipped"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={reload}>
          Refresh
        </Button>
      </div>
      {sourceId && (
        <Link href="/admin/web-data/jobs" className="text-xs text-emerald-800 underline">
          Showing one source — clear filter
        </Link>
      )}
      <Notice message={message} />
      <ErrorBox error={error ?? actionError} />
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Trigger</th>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Fetched</th>
              <th className="px-3 py-2 text-right">New</th>
              <th className="px-3 py-2 text-right">Updated</th>
              <th className="px-3 py-2 text-right">Duplicate</th>
              <th className="px-3 py-2 text-right">Skipped</th>
              <th className="px-3 py-2 text-right">Failed</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-stone-500">
                  No sync jobs yet.
                </td>
              </tr>
            )}
            {data?.items.map((job) => (
              <tr key={job._id} className="border-t border-stone-100 align-top">
                <td className="px-3 py-2">{job.sourceName}</td>
                <td className="px-3 py-2 text-xs">
                  {job.trigger}
                  <br />
                  <span className="text-stone-500">{job.triggeredBy}</span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {formatDate(job.startedAt ?? job.queuedAt, "en", true)}
                  <br />
                  <span className="text-stone-500">
                    {duration(job)} · {job.attempts} attempt(s)
                  </span>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={job.status} />
                  {job.errorSummary && <p className="mt-1 max-w-xs text-xs text-red-800">{job.errorSummary}</p>}
                  {job.recordErrors.length > 0 && (
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-stone-600">{job.recordErrors.length} record error(s)</summary>
                      <ul className="mt-1 max-w-sm space-y-0.5">
                        {job.recordErrors.map((r, i) => (
                          <li key={i} className="break-all">
                            <code>{r.externalId}</code>: {r.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{job.itemsFetched}</td>
                <td className="px-3 py-2 text-right tabular-nums">{job.itemsCreated}</td>
                <td className="px-3 py-2 text-right tabular-nums">{job.itemsUpdated}</td>
                <td className="px-3 py-2 text-right tabular-nums">{job.itemsDuplicate}</td>
                <td className="px-3 py-2 text-right tabular-nums">{job.itemsSkipped}</td>
                <td className="px-3 py-2 text-right tabular-nums">{job.itemsFailed}</td>
                <td className="px-3 py-2">
                  {isAdmin && job.retryable && ["failed", "partial"].includes(job.status) && (
                    <Button variant="secondary" onClick={() => retry(job._id)}>
                      Retry
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
