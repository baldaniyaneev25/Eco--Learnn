import { XMLParser } from "fast-xml-parser";
import { validateSourceUrl } from "@/lib/security/url-guard";
import { htmlToText } from "../text";
import type { RawItem, RecordError, SourceAdapter } from "./types";

type Node = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Reads the text of a parsed XML node, which may be a string or {#text, @_attr}. */
function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === "object") return text((value as Node)["#text"]);
  return "";
}

function atomLink(value: unknown): string {
  for (const link of asArray(value as Node | Node[])) {
    if (typeof link === "string") return link;
    const rel = link["@_rel"];
    if (!rel || rel === "alternate") return text(link["@_href"]);
  }
  return "";
}

function parseDate(raw: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Parses RSS 2.0 or Atom XML into raw items. Documents containing a DOCTYPE
 * are refused outright so custom entity definitions (XXE / entity expansion)
 * can never be processed.
 */
export function parseFeed(xml: string, extraDomains?: string[]): { items: RawItem[]; recordErrors: RecordError[] } {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Feed contains a DOCTYPE/ENTITY declaration; refused");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: true,
    htmlEntities: false,
    parseTagValue: false,
    trimValues: true,
  });
  const doc = parser.parse(xml) as Node;
  const rss = doc.rss as Node | undefined;
  const feed = doc.feed as Node | undefined;
  const rawEntries: Node[] = rss
    ? asArray((rss.channel as Node | undefined)?.item as Node | Node[])
    : feed
      ? asArray(feed.entry as Node | Node[])
      : [];
  if (!rss && !feed) throw new Error("Not an RSS or Atom document");

  const items: RawItem[] = [];
  const recordErrors: RecordError[] = [];
  for (const entry of rawEntries.slice(0, 200)) {
    const link = text(entry.link) && !feed ? text(entry.link) : atomLink(entry.link);
    const guid = text(entry.guid) || text(entry.id);
    const externalId = (guid || link).slice(0, 500);
    try {
      const title = htmlToText(text(entry.title)).slice(0, 500);
      if (!title) throw new Error("Missing title");
      if (!link) throw new Error("Missing link");
      // Item links must point back to an approved domain (attribution + safety).
      const url = validateSourceUrl(link.replace(/^http:/i, "https:"), extraDomains).url.toString();
      const body = text(entry["content:encoded"]) || text(entry.description) || text(entry.summary) || text(entry.content);
      items.push({
        externalId: externalId || url,
        url,
        title,
        text: htmlToText(body),
        publishedAt: parseDate(text(entry.pubDate) || text(entry.published) || text(entry.updated) || text(entry["dc:date"])),
      });
    } catch (err) {
      recordErrors.push({ externalId: externalId || "(unknown)", message: (err as Error).message });
    }
  }
  return { items, recordErrors };
}

export const rssAdapter: SourceAdapter = {
  type: "rss",
  validateConfig(source) {
    const feedUrl = source.integrationConfig?.feedUrl;
    if (!feedUrl) throw new Error("RSS sources need integrationConfig.feedUrl");
    const { approved } = validateSourceUrl(feedUrl);
    if (!approved.sourceTypes.includes("rss")) throw new Error(`${approved.domain} is not approved for RSS`);
  },
  minIntervalMinutes(source) {
    return validateSourceUrl(source.integrationConfig?.feedUrl ?? source.baseUrl).approved.minIntervalMinutes;
  },
  async fetch({ source, fetch }) {
    const res = await fetch(source.integrationConfig!.feedUrl!, {
      accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
      allowedContentTypes: ["application/rss+xml", "application/atom+xml", "application/xml", "text/xml"],
      maxBytes: 3 * 1024 * 1024,
    });
    return { kind: "items", ...parseFeed(res.body) };
  },
};
