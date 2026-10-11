"use client";

import { useState } from "react";
import { api, formatDate } from "@/lib/client/api";
import { t, type Lang } from "@/lib/client/i18n";
import { SampleBadge, Status, useLoader } from "./ContentList";
import { usePrefs } from "./preferences";

interface Indicator {
  id: string;
  code: string;
  name: string;
  nameGu?: string;
  description?: string;
  descriptionGu?: string;
  value: number;
  unit: string;
  referencePeriod: string;
  frequency: string;
  geography: string;
  revisionStatus: "provisional" | "estimate" | "revised" | "final";
  source: { name: string; url: string | null };
  releaseDate?: string;
  lastUpdated?: string;
  isSample: boolean;
}

const STATUS_STYLE: Record<Indicator["revisionStatus"], string> = {
  provisional: "bg-amber-50 text-amber-900 ring-amber-300",
  estimate: "bg-sky-50 text-sky-900 ring-sky-300",
  revised: "bg-violet-50 text-violet-900 ring-violet-300",
  final: "bg-emerald-50 text-emerald-900 ring-emerald-300",
};

function formatValue(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "gu" ? "gu-IN" : "en-IN", { maximumFractionDigits: 2 }).format(value);
}

function History({ code, lang }: { code: string; lang: Lang }) {
  const { data, error, loading, reload } = useLoader(
    () => api<{ series: Indicator[]; revisions: Indicator[] }>(`/api/economic-indicators/${encodeURIComponent(code)}`),
    [code],
  );
  return (
    <div className="mt-3 border-t border-stone-200 pt-3 text-sm">
      <Status loading={loading} error={error} empty={false} lang={lang} onRetry={reload} />
      {data && (
        <>
          <table className="w-full text-left">
            <thead className="text-xs text-stone-500">
              <tr>
                <th className="py-1">{t("referencePeriod", lang)}</th>
                <th className="py-1 text-right">{t("unit", lang)}</th>
                <th className="py-1 text-right" />
              </tr>
            </thead>
            <tbody>
              {data.series.map((s) => (
                <tr key={s.id} className="border-t border-stone-100">
                  <td className="py-1">{s.referencePeriod}</td>
                  <td className="py-1 text-right font-mono">
                    {formatValue(s.value, lang)} <span className="text-xs text-stone-500">{s.unit}</span>
                  </td>
                  <td className="py-1 text-right text-xs">{t(s.revisionStatus, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.revisions.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-stone-600">{t("revisions", lang)}</summary>
              <ul className="mt-1 space-y-1 text-xs text-stone-600">
                {data.revisions.map((r) => (
                  <li key={r.id}>
                    {r.referencePeriod}: {formatValue(r.value, lang)} {r.unit} ({t("lastUpdated", lang)} {formatDate(r.lastUpdated, lang)})
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function IndicatorCard({ ind, lang }: { ind: Indicator; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const name = lang === "gu" ? (ind.nameGu ?? ind.name) : ind.name;
  const description = lang === "gu" ? (ind.descriptionGu ?? ind.description) : ind.description;
  return (
    <article className="flex flex-col rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-2">
        <h2 className="mr-auto font-semibold leading-snug">{name}</h2>
        {ind.isSample && <SampleBadge lang={lang} />}
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-emerald-900">
        {formatValue(ind.value, lang)}
        <span className="ml-1 text-base font-normal text-stone-600">{ind.unit}</span>
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-stone-500">{t("referencePeriod", lang)}</dt>
        <dd className="font-medium">{ind.referencePeriod}</dd>
        <dt className="text-stone-500">{t("geography", lang)}</dt>
        <dd>{ind.geography}</dd>
        <dt className="text-stone-500">{t("released", lang)}</dt>
        <dd>{formatDate(ind.releaseDate, lang)}</dd>
        <dt className="text-stone-500">{t("lastUpdated", lang)}</dt>
        <dd>{formatDate(ind.lastUpdated, lang, true)}</dd>
      </dl>
      <span className={`mt-2 w-fit rounded px-2 py-0.5 text-xs font-semibold ring-1 ${STATUS_STYLE[ind.revisionStatus]}`}>
        {t(ind.revisionStatus, lang)}
      </span>
      {description && <p className="mt-3 text-sm text-stone-700">{description}</p>}
      <p className="mt-3 text-xs text-stone-600">
        {t("source", lang)}:{" "}
        {ind.source.url ? (
          <a href={ind.source.url} target="_blank" rel="noopener noreferrer nofollow" className="text-emerald-800 underline">
            {ind.source.name} ↗
          </a>
        ) : (
          <span>{ind.source.name}</span>
        )}
      </p>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-3 w-fit text-xs text-emerald-800 underline">
        {open ? t("hideHistory", lang) : t("history", lang)}
      </button>
      {open && <History code={ind.code} lang={lang} />}
    </article>
  );
}

export function EconomyDashboard() {
  const { lang } = usePrefs();
  const { data, error, loading, reload } = useLoader(() => api<{ items: Indicator[] }>("/api/economic-indicators"), []);
  return (
    <section>
      <h1 className="text-2xl font-bold">{t("economy", lang)}</h1>
      <p className="mt-2 max-w-3xl rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{t("indicatorNote", lang)}</p>
      <div className="mt-4">
        <Status loading={loading} error={error} empty={data?.items.length === 0} lang={lang} onRetry={reload} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((ind) => <IndicatorCard key={ind.id} ind={ind} lang={lang} />)}
      </div>
    </section>
  );
}
