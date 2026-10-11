"use client";

import Link from "next/link";
import { useState } from "react";
import { api, formatDate, type Paged } from "@/lib/client/api";
import { Badge, ErrorBox, inputClass, Pager, useAsync } from "./ui";

interface LogRow {
  _id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

const ACTIONS = ["", "item", "source", "sync", "translation", "indicator", "auth"];

export function AuditLog() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, error } = useAsync(() => {
    const p = new URLSearchParams({ page: String(page), limit: "50" });
    if (action) p.set("action", action);
    return api<Paged<LogRow>>(`/api/admin/content-audit-logs?${p}`);
  }, [action, page]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Web Data Manager · Audit log</h1>
        <select
          className={`${inputClass} w-auto`}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a ? `${a}.*` : "All actions"}
            </option>
          ))}
        </select>
      </div>
      <ErrorBox error={error} />
      <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white text-sm">
        {data?.items.length === 0 && <li className="p-4 text-center text-stone-500">No entries.</li>}
        {data?.items.map((log) => (
          <li key={log._id} className="flex flex-wrap items-start gap-2 px-3 py-2">
            <span className="w-40 shrink-0 text-xs text-stone-500">{formatDate(log.createdAt, "en", true)}</span>
            <Badge tone={log.action.startsWith("source.alert") ? "red" : "gray"}>{log.action}</Badge>
            <span className="text-xs text-stone-600">{log.actorEmail}</span>
            <span className="min-w-0 flex-1">
              {log.entityType === "importedItem" && log.entityId ? (
                <Link href={`/admin/web-data/items/${log.entityId}`} className="text-emerald-900 hover:underline">
                  {log.summary}
                </Link>
              ) : (
                log.summary
              )}
            </span>
          </li>
        ))}
      </ul>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
