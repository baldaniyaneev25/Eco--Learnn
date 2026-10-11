"use client";

import { useState } from "react";
import { DIFFICULTIES } from "@/config/categories";
import { t } from "@/lib/client/i18n";
import { ContentList } from "./ContentList";
import { usePrefs } from "./preferences";

export function NewsView() {
  const { lang } = usePrefs();
  return <ContentList endpoint="/api/economics-news" title={t("news", lang)} linkItems />;
}

export function CurrentAffairsView() {
  const { lang } = usePrefs();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return (
    <ContentList
      endpoint="/api/current-affairs"
      title={t("currentAffairs", lang)}
      linkItems
      useClassFilter
      extraParams={params}
      filters={
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            {t("from", lang)}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-stone-300 px-2 py-1" />
          </label>
          <label className="flex items-center gap-1">
            {t("to", lang)}
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-stone-300 px-2 py-1" />
          </label>
        </div>
      }
    />
  );
}

export function ResourcesView() {
  const { lang } = usePrefs();
  const [difficulty, setDifficulty] = useState("");
  return (
    <ContentList
      endpoint="/api/learning-resources"
      title={t("resources", lang)}
      useClassFilter
      extraParams={difficulty ? { difficulty } : {}}
      filters={
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded border border-stone-300 bg-white px-2 py-1 text-sm">
          <option value="">{t("difficulty", lang)}: —</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {t(d, lang)}
            </option>
          ))}
        </select>
      }
    />
  );
}
