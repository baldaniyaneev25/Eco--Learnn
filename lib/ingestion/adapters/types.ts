import type { Types } from "mongoose";
import type { SafeFetchOptions, SafeFetchResult } from "@/lib/security/safe-fetch";
import type { SourceType } from "@/config/approved-sources";

/** The subset of a DataSource document that adapters read. */
export interface SourceLike {
  _id: Types.ObjectId;
  name: string;
  sourceType: SourceType;
  baseUrl: string;
  isSample?: boolean | null;
  categories?: string[] | null;
  integrationConfig?: {
    feedUrl?: string | null;
    indicators?: string[] | null;
    country?: string | null;
    dataset?: string | null;
    language?: string | null;
    contentPolicy?: string | null;
    defaultSection?: string | null;
  } | null;
}

export type Fetcher = (url: string, options?: SafeFetchOptions) => Promise<SafeFetchResult>;

export interface AdapterContext {
  source: SourceLike;
  fetch: Fetcher;
  now: Date;
}

/** An item as extracted from a source, before normalisation. Text is plain text. */
export interface RawItem {
  externalId: string;
  url: string;
  title: string;
  text: string;
  language?: "en" | "gu";
  publishedAt?: Date;
  section?: string;
  category?: string;
}

export interface RawIndicator {
  indicatorCode: string;
  name: string;
  nameGu?: string;
  description?: string;
  descriptionGu?: string;
  value: number;
  unit: string;
  referencePeriod: string;
  frequency: "monthly" | "quarterly" | "annual";
  geography: string;
  sourceUrl: string;
  releaseDate?: Date;
  revisionStatus: "provisional" | "estimate" | "revised" | "final";
}

export interface RecordError {
  externalId: string;
  message: string;
}

export type AdapterResult =
  | { kind: "items"; items: RawItem[]; recordErrors: RecordError[] }
  | { kind: "indicators"; indicators: RawIndicator[]; recordErrors: RecordError[] };

export interface SourceAdapter {
  type: SourceType;
  /** Throws a descriptive Error when the source configuration is invalid. */
  validateConfig(source: SourceLike): void;
  /** Minimum minutes between fetches permitted for this source. */
  minIntervalMinutes(source: SourceLike): number;
  fetch(ctx: AdapterContext): Promise<AdapterResult>;
}
