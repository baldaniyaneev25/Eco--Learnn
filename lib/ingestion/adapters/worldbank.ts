import { z } from "zod";
import { findWorldBankIndicator } from "@/config/worldbank-indicators";
import { validateSourceUrl } from "@/lib/security/url-guard";
import type { RawIndicator, RecordError, SourceAdapter } from "./types";

const API_BASE = "https://api.worldbank.org/v2";

const MetaSchema = z.object({
  page: z.coerce.number(),
  pages: z.coerce.number(),
  lastupdated: z.string().optional(),
});

const ObservationSchema = z.object({
  indicator: z.object({ id: z.string(), value: z.string() }),
  country: z.object({ id: z.string(), value: z.string() }),
  date: z.string().regex(/^\d{4}$/),
  value: z.number().nullable(),
});

/** Validates and converts a World Bank API response into indicator records. */
export function parseWorldBankResponse(
  json: unknown,
  code: string,
): { indicators: RawIndicator[]; recordErrors: RecordError[] } {
  const def = findWorldBankIndicator(code);
  if (!def) throw new Error(`Indicator ${code} is not in the approved catalogue`);
  if (!Array.isArray(json) || json.length < 2) {
    const message = Array.isArray(json) ? JSON.stringify(json[0]).slice(0, 200) : "unexpected payload";
    throw new Error(`World Bank API error for ${code}: ${message}`);
  }
  const meta = MetaSchema.parse(json[0]);
  const rows = Array.isArray(json[1]) ? json[1] : [];
  const releaseDate = meta.lastupdated ? new Date(meta.lastupdated) : undefined;
  const indicators: RawIndicator[] = [];
  const recordErrors: RecordError[] = [];

  for (const row of rows) {
    const parsed = ObservationSchema.safeParse(row);
    if (!parsed.success) {
      recordErrors.push({ externalId: `${code}`, message: "Malformed observation" });
      continue;
    }
    const obs = parsed.data;
    if (obs.value === null) continue; // not yet published for that year
    if (obs.indicator.id !== code) {
      recordErrors.push({ externalId: `${code}:${obs.date}`, message: "Indicator code mismatch" });
      continue;
    }
    indicators.push({
      indicatorCode: `WB.${code}`,
      name: def.name,
      nameGu: def.nameGu,
      description: def.description,
      descriptionGu: def.descriptionGu,
      value: obs.value,
      unit: def.unit,
      referencePeriod: obs.date,
      frequency: "annual",
      geography: obs.country.value,
      sourceUrl: `https://data.worldbank.org/indicator/${code}?locations=${obs.country.id}`,
      releaseDate: releaseDate && !Number.isNaN(releaseDate.getTime()) ? releaseDate : undefined,
      // World Bank figures are compiled estimates that are revised between releases.
      revisionStatus: "estimate",
    });
  }
  return { indicators, recordErrors };
}

export const worldBankAdapter: SourceAdapter = {
  type: "worldbank",
  validateConfig(source) {
    validateSourceUrl(API_BASE);
    const codes = source.integrationConfig?.indicators ?? [];
    if (codes.length === 0) throw new Error("World Bank sources need at least one indicator code");
    for (const code of codes) {
      if (!findWorldBankIndicator(code)) throw new Error(`Indicator ${code} is not in the approved catalogue`);
    }
    if (!/^[A-Z]{2,3}$/.test(source.integrationConfig?.country ?? "")) {
      throw new Error("integrationConfig.country must be an ISO country code such as IND");
    }
  },
  minIntervalMinutes() {
    return validateSourceUrl(API_BASE).approved.minIntervalMinutes;
  },
  async fetch({ source, fetch }) {
    const country = source.integrationConfig!.country!;
    const indicators: RawIndicator[] = [];
    const recordErrors: RecordError[] = [];
    for (const code of source.integrationConfig!.indicators!) {
      const url = `${API_BASE}/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(code)}?format=json&mrv=10&per_page=10`;
      const res = await fetch(url, { accept: "application/json", allowedContentTypes: ["application/json"], maxBytes: 512 * 1024 });
      let json: unknown;
      try {
        json = JSON.parse(res.body);
      } catch {
        recordErrors.push({ externalId: code, message: "Response was not valid JSON" });
        continue;
      }
      try {
        const parsed = parseWorldBankResponse(json, code);
        indicators.push(...parsed.indicators);
        recordErrors.push(...parsed.recordErrors);
      } catch (err) {
        recordErrors.push({ externalId: code, message: (err as Error).message });
      }
    }
    return { kind: "indicators", indicators, recordErrors };
  },
};
