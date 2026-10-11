"use client";

import Link from "next/link";
import { api, type Paged } from "@/lib/client/api";
import { t } from "@/lib/client/i18n";
import { ItemCard, Status, useLoader, type PublicItem } from "./ContentList";
import { usePrefs } from "./preferences";

const MODULES = [
  { href: "/news", key: "news", icon: "📰" },
  { href: "/current-affairs", key: "currentAffairs", icon: "🗓️" },
  { href: "/economy", key: "economy", icon: "📊" },
  { href: "/resources", key: "resources", icon: "📚" },
] as const;

export function HomeView() {
  const { lang, ready } = usePrefs();
  const { data, error, loading, reload } = useLoader(
    async () => (ready ? api<Paged<PublicItem>>(`/api/economics-news?limit=3&lang=${lang}`) : null),
    [lang, ready],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-emerald-800 px-6 py-8 text-white">
        <h1 className="text-3xl font-bold">{t("appName", lang)}</h1>
        <p className="mt-1 text-emerald-100">{t("tagline", lang)}</p>
        <p className="mt-4 max-w-2xl text-sm text-emerald-50">{t("modulesIntro", lang)}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-emerald-600">
            <span aria-hidden className="text-2xl">
              {m.icon}
            </span>
            <span className="mt-2 block font-semibold">{t(m.key, lang)}</span>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("latestNews", lang)}</h2>
          <Link href="/news" className="text-sm text-emerald-800 underline">
            {t("seeAll", lang)}
          </Link>
        </div>
        <Status loading={loading || !data} error={error} empty={data?.items.length === 0} lang={lang} onRetry={reload} />
        <div className="grid gap-4">
          {data?.items.map((item) => (
            <ItemCard key={item.id} item={item} lang={lang} href={`/news/${item.id}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
