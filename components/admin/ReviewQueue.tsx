"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, categoryLabel } from "@/config/categories";
import { api, formatDate, type Paged } from "@/lib/client/api";
import { Badge, Button, ErrorBox, inputClass, Pager, StatusBadge, useAsync } from "./ui";

interface ItemRow {
  _id: string;
  title: string;
  sourceName: string;
  canonicalUrl: string;
  originalLanguage: string;
  category: string;
  suggestedSection: string;
  relevanceScore: number;
  reviewStatus: string;
  publishedAt?: string;
  retrievedAt: string;
  isSample: boolean;
  flags: { needsTranslation: boolean; needsAcademicReview: boolean; needsFactCheck: boolean; sourceUpdatedAfterReview: boolean };
}

export function ReviewQueue() {
  const params = useSearchParams();
  const [status, setStatus] = useState("pending");
  const [category, setCategory] = useState("");
  const [flag, setFlag] = useState("");
  const [lang, setLang] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const sourceId = params.get("sourceId") ?? "";

  const { data, error, loading, reload } = useAsync(() => {
    const p = new URLSearchParams({ page: String(page), limit: "25" });
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    if (flag) p.set("flag", flag);
    if (lang) p.set("lang", lang);
    if (search) p.set("q", search);
    if (sourceId) p.set("sourceId", sourceId);
    return api<Paged<ItemRow>>(`/api/admin/imported-items?${p}`);
  }, [status, category, flag, lang, search, page, sourceId]);

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Web Data Manager · Review queue</h1>
      <p className="text-sm text-stone-600">
        Imported items are kept separate from official study notes. Nothing reaches students until an editor approves it with an original summary.
      </p>
      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          reset(() => setSearch(q));
        }}
      >
        <input className={`${inputClass} max-w-xs`} placeholder="Search title or URL" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        <select className={`${inputClass} w-auto`} value={status} onChange={(e) => reset(() => setStatus(e.target.value))}>
          <option value="">All statuses</option>
          {["pending", "approved", "rejected", "archived"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className={`${inputClass} w-auto`} value={category} onChange={(e) => reset(() => setCategory(e.target.value))}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label.en}
            </option>
          ))}
        </select>
        <select className={`${inputClass} w-auto`} value={flag} onChange={(e) => reset(() => setFlag(e.target.value))}>
          <option value="">Any flag</option>
          <option value="needsFactCheck">Needs fact-check</option>
          <option value="needsAcademicReview">Needs academic review</option>
          <option value="needsTranslation">Needs translation</option>
          <option value="sourceUpdatedAfterReview">Changed at source after review</option>
        </select>
        <select className={`${inputClass} w-auto`} value={lang} onChange={(e) => reset(() => setLang(e.target.value))}>
          <option value="">Any language</option>
          <option value="en">English</option>
          <option value="gu">Gujarati</option>
        </select>
        {sourceId && (
          <Link href="/admin/web-data/review" className="text-xs text-emerald-800 underline">
            Clear source filter
          </Link>
        )}
      </form>
      <ErrorBox error={error} />
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Published / retrieved</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-stone-500">
                  No items match these filters.
                </td>
              </tr>
            )}
            {data?.items.map((item) => (
              <tr key={item._id} className="border-t border-stone-100 align-top">
                <td className="px-3 py-2">
                  <Link href={`/admin/web-data/items/${item._id}`} className="font-medium text-emerald-900 hover:underline">
                    {item.title}
                  </Link>
                  <div className="mt-0.5 flex gap-1 text-xs text-stone-500">
                    <span>{item.originalLanguage.toUpperCase()}</span>·<span>{item.suggestedSection}</span>·<span>relevance {item.relevanceScore}</span>
                    {item.isSample && <Badge tone="amber">sample</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{item.sourceName}</td>
                <td className="px-3 py-2 text-xs">{categoryLabel(item.category, "en")}</td>
                <td className="space-x-1 px-3 py-2">
                  {item.flags.needsFactCheck && <Badge tone="red">fact-check</Badge>}
                  {item.flags.needsAcademicReview && <Badge tone="violet">academic</Badge>}
                  {item.flags.needsTranslation && <Badge tone="blue">translate</Badge>}
                  {item.flags.sourceUpdatedAfterReview && <Badge tone="amber">source changed</Badge>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {formatDate(item.publishedAt)}
                  <br />
                  <span className="text-stone-500">{formatDate(item.retrievedAt, "en", true)}</span>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={item.reviewStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && (
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span>{data.total} item(s)</span>
          <Button variant="ghost" onClick={reload}>
            Refresh
          </Button>
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}
