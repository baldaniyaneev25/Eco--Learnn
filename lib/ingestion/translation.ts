import type { Types } from "mongoose";
import { env } from "@/lib/env";
import { Translation } from "@/lib/models/Translation";

export interface TranslationProvider {
  name: string;
  translate(text: string, from: "en" | "gu", to: "en" | "gu"): Promise<string>;
}

/** LibreTranslate-compatible HTTP API, configured only through server env vars. */
function libreTranslateProvider(url: string, apiKey?: string): TranslationProvider {
  return {
    name: "libretranslate",
    async translate(text, from, to) {
      if (!text.trim()) return "";
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: text, source: from, target: to, format: "text", api_key: apiKey }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Translation provider returned HTTP ${res.status}`);
      const json = (await res.json()) as { translatedText?: unknown };
      if (typeof json.translatedText !== "string") throw new Error("Translation provider returned no text");
      return json.translatedText.slice(0, 5000);
    },
  };
}

export function getTranslationProvider(): TranslationProvider | null {
  if (env.translationProvider === "libretranslate" && env.translationApiUrl) {
    return libreTranslateProvider(env.translationApiUrl, env.translationApiKey);
  }
  return null;
}

const GU_DIGITS = "૦૧૨૩૪૫૬૭૮૯";

/** Numbers (in Latin or Gujarati digits) present in the text, normalised to Latin digits. */
export function extractNumbers(text: string): string[] {
  const latin = text.replace(/[૦-૯]/g, (d) => String(GU_DIGITS.indexOf(d)));
  return (latin.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, "")).sort();
}

/** True when every figure in the source text survives translation unchanged. */
export function numbersPreserved(source: string, translated: string): boolean {
  const a = extractNumbers(source);
  const b = extractNumbers(translated);
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

/**
 * Creates a machine translation draft for an imported item, if a provider is
 * configured. Never overwrites an existing (possibly human-edited) translation.
 */
export async function createMachineDraft(
  item: { _id: Types.ObjectId; title: string; summaryDraft: string; originalLanguage: "en" | "gu" },
  provider: TranslationProvider | null = getTranslationProvider(),
): Promise<boolean> {
  if (!provider) return false;
  const target = item.originalLanguage === "en" ? "gu" : "en";
  const exists = await Translation.exists({ importedItemId: item._id, language: target });
  if (exists) return false;
  const [title, summary] = await Promise.all([
    provider.translate(item.title, item.originalLanguage, target),
    provider.translate(item.summaryDraft, item.originalLanguage, target),
  ]);
  const preserved = numbersPreserved(`${item.title} ${item.summaryDraft}`, `${title} ${summary}`);
  await Translation.create({
    importedItemId: item._id,
    language: target,
    translatedTitle: title,
    translatedSummary: summary,
    translationMethod: "machine",
    reviewStatus: "draft",
    provider: preserved ? provider.name : `${provider.name} (numbers changed — check figures)`,
  });
  return true;
}
