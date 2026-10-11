import { CATEGORIES, type CategoryCode } from "@/config/categories";

export interface Classification {
  category: CategoryCode;
  /** 0–1: how strongly the text matches economics topics. */
  relevance: number;
  matched: string[];
}

function countOccurrences(haystack: string, needle: string): number {
  // Word boundaries for Latin keywords; Gujarati has no \b support, so use plain includes.
  if (/^[\x00-\x7f]+$/.test(needle)) {
    const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    return haystack.match(re)?.length ?? 0;
  }
  return haystack.split(needle).length - 1;
}

/**
 * Keyword-based topic classification. Deliberately simple and transparent:
 * it only suggests a category; an editor confirms it during review.
 */
export function classify(title: string, text: string, allowed?: CategoryCode[]): Classification {
  const haystack = `${title} ${title} ${text}`.toLowerCase();
  let best: Classification = { category: "general-economy", relevance: 0, matched: [] };
  let totalHits = 0;

  for (const cat of CATEGORIES) {
    if (allowed?.length && !allowed.includes(cat.code)) continue;
    let hits = 0;
    const matched: string[] = [];
    for (const keyword of cat.keywords) {
      const n = countOccurrences(haystack, keyword.toLowerCase());
      if (n > 0) {
        hits += n;
        matched.push(keyword);
      }
    }
    totalHits += hits;
    if (hits > 0 && (best.matched.length === 0 || hits > best.relevance)) {
      best = { category: cat.code, relevance: hits, matched };
    }
  }

  const relevance = best.matched.length === 0 ? 0 : Math.min(1, 0.3 + totalHits / 10);
  return { ...best, relevance: Math.round(relevance * 100) / 100 };
}
