"use client";

import { useState } from "react";
import { api, formatDate, type Paged } from "@/lib/client/api";
import { Badge, Button, ErrorBox, inputClass, Pager, useAsync } from "./ui";

interface IndicatorRow {
  _id: string;
  indicatorCode: string;
  name: string;
  value: number;
  unit: string;
  referencePeriod: string;
  frequency: string;
  geography: string;
  sourceName: string;
  sourceUrl: string;
  releaseDate?: string;
  retrievedAt: string;
  revisionStatus: string;
  isLatest: boolean;
  isVerified: boolean;
  verifiedBy?: string;
  isSample: boolean;
}

const REVISION = ["provisional", "estimate", "revised", "final"];

export function IndicatorsAdmin() {
  const [verified, setVerified] = useState("false");
  const [history, setHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = useAsync(() => {
    const p = new URLSearchParams({ page: String(page), limit: "50" });
    if (verified) p.set("verified", verified);
    if (history) p.set("history", "true");
    return api<Paged<IndicatorRow>>(`/api/admin/economic-indicators?${p}`);
  }, [verified, history, page]);

  async function patch(id: string, json: Record<string, unknown>) {
    setActionError(null);
    try {
      await api(`/api/admin/economic-indicators/${id}`, { method: "PATCH", json });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Web Data Manager · Economic indicators</h1>
        <select
          className={`${inputClass} w-auto`}
          value={verified}
          onChange={(e) => {
            setVerified(e.target.value);
            setPage(1);
          }}
        >
          <option value="false">Awaiting verification</option>
          <option value="true">Verified (shown to students)</option>
          <option value="">All</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
          Include superseded values
        </label>
      </div>
      <p className="text-sm text-stone-600">
        Verify each value against the source (value, unit, reference period, revision status) before it appears on the student dashboard. Revised
        releases are stored as new records; earlier values are kept as history.
      </p>
      <ErrorBox error={error ?? actionError} />
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">Indicator</th>
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="px-3 py-2">Source / release</th>
              <th className="px-3 py-2">Revision status</th>
              <th className="px-3 py-2">Verification</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-stone-500">
                  Nothing here.
                </td>
              </tr>
            )}
            {data?.items.map((i) => (
              <tr key={i._id} className={`border-t border-stone-100 align-top ${i.isLatest ? "" : "text-stone-400"}`}>
                <td className="px-3 py-2">
                  {i.name}
                  <div className="text-xs text-stone-500">
                    <code>{i.indicatorCode}</code> · {i.frequency} · {i.geography} {i.isSample && <Badge tone="amber">sample</Badge>}
                    {!i.isLatest && <Badge>superseded</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2">{i.referencePeriod}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {i.value} <span className="text-xs text-stone-500">{i.unit}</span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {i.isSample ? (
                    i.sourceName
                  ) : (
                    <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline">
                      {i.sourceName}
                    </a>
                  )}
                  <br />
                  released {formatDate(i.releaseDate)} · retrieved {formatDate(i.retrievedAt, "en", true)}
                </td>
                <td className="px-3 py-2">
                  <select className={`${inputClass} w-auto`} value={i.revisionStatus} onChange={(e) => patch(i._id, { revisionStatus: e.target.value })}>
                    {REVISION.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {i.isVerified ? (
                    <div className="space-y-1">
                      <Badge tone="green">verified</Badge>
                      <p className="text-xs text-stone-500">{i.verifiedBy}</p>
                      <Button variant="ghost" onClick={() => patch(i._id, { isVerified: false })}>
                        Unverify
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => patch(i._id, { isVerified: true })}>Verify</Button>
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
