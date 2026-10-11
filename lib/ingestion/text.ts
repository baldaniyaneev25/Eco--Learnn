import crypto from "node:crypto";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  rupee: "₹",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Converts untrusted HTML to plain text. Scripts, styles and all markup are
 * dropped; the result is only ever rendered as text, never as HTML.
 */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|iframe|object|embed|noscript|template|svg)[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<\/?(p|div|br|li|h[1-6]|tr)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[<>]/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

/** Gujarati script occupies U+0A80–U+0AFF. */
export function detectLanguage(text: string, fallback: "en" | "gu" = "en"): "en" | "gu" {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return fallback;
  const gujarati = text.match(/[઀-૿]/g)?.length ?? 0;
  return gujarati / letters > 0.3 ? "gu" : "en";
}

const TRACKING_PARAMS = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|source)$/i;

/** Normalises a URL so the same article fetched twice maps to one record. */
export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.hostname.startsWith("www.")) url.hostname = url.hostname.slice(4);
  url.protocol = "https:";
  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [key, value] of kept) url.searchParams.append(key, value);
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

export function contentFingerprint(title: string, text: string): string {
  const normalise = (s: string) => s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(`${normalise(title)}\n${normalise(text)}`).digest("hex");
}

/** Numbers, percentages and currency figures signal facts that need checking. */
export function containsFigures(text: string): boolean {
  return /(\d+(\.\d+)?\s?(%|per ?cent|crore|lakh|billion|million|bps|basis points))|₹\s?\d|[૦-૯]+/i.test(text);
}
