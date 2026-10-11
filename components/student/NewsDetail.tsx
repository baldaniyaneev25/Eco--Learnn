"use client";

import Link from "next/link";
import { use } from "react";
import { categoryLabel } from "@/config/categories";
import { api } from "@/lib/client/api";
import { t } from "@/lib/client/i18n";
import { Attribution, SampleBadge, Status, useLoader, type PublicItem } from "./ContentList";
import { usePrefs } from "./preferences";

export function NewsDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, ready } = usePrefs();
  const { data, error, loading, reload } = useLoader(
    async () => (ready ? api<{ item: PublicItem }>(`/api/economics-news/${encodeURIComponent(id)}?lang=${lang}`) : null),
    [id, lang, ready],
  );
  const item = data?.item;

  return (
    <div className="max-w-3xl">
      <Link href="/news" className="text-sm text-emerald-800 underline">
        ← {t("back", lang)}
      </Link>
      <Status loading={loading || !data} error={error} empty={false} lang={lang} onRetry={reload} />
      {item && (
        <article lang={item.displayLanguage} className="mt-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">{categoryLabel(item.category, lang)}</span>
            {item.isSample && <SampleBadge lang={lang} />}
          </div>
          <h1 className="text-2xl font-bold leading-snug">{item.title}</h1>
          <p className="mt-4 whitespace-pre-line text-lg text-stone-800">{item.summary}</p>
          <p className="mt-4 text-xs text-stone-500">{t("summaryNote", lang)}</p>
          {item.translationUnavailable && <p className="mt-1 text-xs text-amber-800">{t("translationUnavailable", lang)}</p>}
          {item.isTranslation && <p className="mt-1 text-xs text-stone-500">{t("translatedNote", lang)}</p>}
          <Attribution item={item} lang={lang} />
        </article>
      )}
    </div>
  );
}
