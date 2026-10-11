import type { SourceType } from "@/config/approved-sources";
import { rssAdapter } from "./rss";
import { sampleAdapter } from "./sample";
import type { SourceAdapter } from "./types";
import { worldBankAdapter } from "./worldbank";

const ADAPTERS: Record<SourceType, SourceAdapter> = {
  rss: rssAdapter,
  worldbank: worldBankAdapter,
  sample: sampleAdapter,
};

export function getAdapter(type: SourceType): SourceAdapter {
  const adapter = ADAPTERS[type];
  if (!adapter) throw new Error(`Unsupported source type: ${type}`);
  return adapter;
}
