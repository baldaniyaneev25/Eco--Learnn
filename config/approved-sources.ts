// The allowlist of domains and integration types the ingestion system may
// contact. Admins can only configure data sources whose URLs fall inside this
// list (plus ALLOWED_SOURCE_DOMAINS). Adding a domain is a code/deployment
// change on purpose: it should happen only after the source's terms of use,
// licensing and rate limits have been reviewed.

export const SOURCE_TYPES = ["rss", "worldbank", "sample"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONTENT_POLICIES = ["full-text", "excerpt", "metadata-only"] as const;
export type ContentPolicy = (typeof CONTENT_POLICIES)[number];

export interface ApprovedDomain {
  domain: string;
  organisation: string;
  sourceTypes: SourceType[];
  /** Hard floor between fetches, regardless of admin configuration. */
  minIntervalMinutes: number;
  /** What may be stored by default. Admins can only make this stricter. */
  maxContentPolicy: ContentPolicy;
  termsUrl?: string;
  notes: string;
}

export const APPROVED_DOMAINS: ApprovedDomain[] = [
  {
    domain: "rbi.org.in",
    organisation: "Reserve Bank of India",
    sourceTypes: ["rss"],
    minIntervalMinutes: 60,
    maxContentPolicy: "excerpt",
    termsUrl: "https://www.rbi.org.in/Scripts/Disclaimer.aspx",
    notes:
      "RBI publishes RSS feeds for press releases and notifications. Store titles, links and short excerpts; " +
      "write original summaries for students. Confirm the current feed URLs and disclaimer before enabling.",
  },
  {
    domain: "pib.gov.in",
    organisation: "Press Information Bureau",
    sourceTypes: ["rss"],
    minIntervalMinutes: 60,
    maxContentPolicy: "excerpt",
    termsUrl: "https://pib.gov.in/",
    notes:
      "PIB offers ministry-wise RSS feeds. Feed URLs include ministry and language parameters; verify them " +
      "and the site's reuse policy before enabling.",
  },
  {
    domain: "api.worldbank.org",
    organisation: "World Bank (World Development Indicators)",
    sourceTypes: ["worldbank"],
    minIntervalMinutes: 24 * 60,
    maxContentPolicy: "full-text",
    termsUrl: "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets",
    notes:
      "Public JSON API, no key required. Most WDI datasets are CC BY 4.0 — attribute the World Bank. " +
      "Annual data; values are revised between releases, so history is kept.",
  },
];

export function findApprovedDomain(
  hostname: string,
  extraDomains: string[] = [],
): ApprovedDomain | undefined {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  const known = APPROVED_DOMAINS.find((d) => matches(d.domain));
  if (known) return known;
  const extra = extraDomains.find(matches);
  if (extra) {
    return {
      domain: extra,
      organisation: extra,
      sourceTypes: ["rss"],
      minIntervalMinutes: 60,
      maxContentPolicy: "excerpt",
      notes: "Added through ALLOWED_SOURCE_DOMAINS.",
    };
  }
  return undefined;
}

const POLICY_RANK: Record<ContentPolicy, number> = { "metadata-only": 0, excerpt: 1, "full-text": 2 };

/** Returns the stricter of the requested and the permitted content policy. */
export function clampContentPolicy(requested: ContentPolicy, max: ContentPolicy): ContentPolicy {
  return POLICY_RANK[requested] <= POLICY_RANK[max] ? requested : max;
}

/** Hard floor for the bundled sample adapter (no network access). */
export const SAMPLE_MIN_INTERVAL_MINUTES = 1;
