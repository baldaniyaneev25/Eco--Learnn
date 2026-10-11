"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useLoader } from "@/lib/client/use-loader";
import { CATEGORIES, categoryLabel } from "@/config/categories";
import { api, formatDate, type Paged } from "@/lib/client/api";
import { t, type Lang } from "@/lib/client/i18n";
import { usePrefs } from "./preferences";

export interface PublicItem {
  id: string;
  section: string;
  title: string;
  summary: string;
  displayLanguage: Lang;
  originalLanguage: Lang;
  isTranslation: boolean;
  translationUnavailable: boolean;
  category: string;
  classLevels: string[];
  difficulty?: string;
  source: { name: string; url: string | null };
  publishedAt?: string;
  retrievedAt?: string;
  isSample: boolean;
}

export function SampleBadge({ lang }: { lang: Lang }) {
  return (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300">
      {t("sampleData", lang)}
    </span>
  );
}

export function Attribution({ item, lang }: { item: PublicItem; lang: Lang }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
      <span>
        {t("source", lang)}: <strong>{item.source.name}</strong>
      </span>
      <span>
        {t("published", lang)}: {formatDate(item.publishedAt, lang)}
      </span>
      {item.source.url ? (
        <a href={item.source.url} target="_blank" rel="noopener noreferrer nofollow" className="text-emerald-800 underline">
          {t("readOriginal", lang)} ↗
        </a>
      ) : (
        <span className="italic">{t("noSourceLink", lang)}</span>
      )}
    </div>
  );
}

export function ItemCard({ item, lang, href }: { item: PublicItem; lang: Lang; href?: string }) {
  return (
    <article lang={item.displayLanguage} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">{categoryLabel(item.category, lang)}</span>
        {item.difficulty && <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-800">{t(item.difficulty as "beginner", lang)}</span>}
        {item.classLevels.length > 0 && (
          <span className="rounded bg-stone-100 px-2 py-0.5 text-stone-700">
            {t("forClasses", lang)} {item.classLevels.join(", ")}
          </span>
        )}
        {item.isSample && <SampleBadge lang={lang} />}
      </div>
      <h2 className="text-lg font-semibold leading-snug">
        {href ? (
          <Link href={href} className="hover:text-emerald-800">
            {item.title}
          </Link>
        ) : (
          item.title
        )}
      </h2>
      <p className="mt-2 text-stone-700">{item.summary}</p>
      {item.translationUnavailable && <p className="mt-2 text-xs text-amber-800">{t("translationUnavailable", lang)}</p>}
      {item.isTranslation && <p className="mt-2 text-xs text-stone-500">{t("translatedNote", lang)}</p>}
      <Attribution item={item} lang={lang} />
    </article>
  );
}

export { useLoader };

export function Status({ loading, error, empty, lang, onRetry }: { loading: boolean; error: string | null; empty: boolean; lang: Lang; onRetry: () => void }) {
  if (loading) return <p className="py-8 text-center text-stone-500">{t("loading", lang)}</p>;
  if (error)
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {t("error", lang)} ({error}){" "}
        <button type="button" className="underline" onClick={onRetry}>
          {t("retry", lang)}
        </button>
      </div>
    );
  if (empty) return <p className="py-8 text-center text-stone-500">{t("empty", lang)}</p>;
  return null;
}

export function CategorySelect({ value, onChange, lang }: { value: string; onChange: (v: string) => void; lang: Lang }) {
  return (
    <select className="rounded border border-stone-300 bg-white px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("allCategories", lang)}</option>
      {CATEGORIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label[lang]}
        </option>
      ))}
    </select>
  );
}

/** Paginated list of approved items from a public endpoint. */
export function ContentList({
  endpoint,
  title,
  linkItems = false,
  filters,
  extraParams = {},
  useClassFilter = false,
}: {
  endpoint: string;
  title: string;
  linkItems?: boolean;
  filters?: ReactNode;
  extraParams?: Record<string, string>;
  useClassFilter?: boolean;
}) {
  const { lang, classLevel, board, ready } = usePrefs();
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const extra = JSON.stringify(extraParams);

  const { data, error, loading, reload } = useLoader(async () => {
    if (!ready) return null;
    const params = new URLSearchParams({ lang, page: String(page), limit: "10", ...JSON.parse(extra) });
    if (category) params.set("category", category);
    if (useClassFilter) {
      params.set("class", classLevel);
      params.set("board", board);
    }
    return api<Paged<PublicItem>>(`${endpoint}?${params}`);
  }, [endpoint, lang, page, category, classLevel, board, extra, ready, useClassFilter]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">{title}</h1>
        {filters}
        <CategorySelect
          value={category}
          lang={lang}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        />
      </div>
      <Status loading={loading || !data} error={error} empty={data?.items.length === 0} lang={lang} onRetry={reload} />
      <div className="grid gap-4">
        {data?.items.map((item) => (
          <ItemCard key={item.id} item={item} lang={lang} href={linkItems ? `/news/${item.id}` : undefined} />
        ))}
      </div>
      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">
            {t("previous", lang)}
          </button>
          <span>
            {t("page", lang)} {data.page} / {data.totalPages}
          </span>
          <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">
            {t("next", lang)}
          </button>
        </div>
      )}
    </section>
  );
}
