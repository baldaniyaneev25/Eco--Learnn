import { SAMPLE_MIN_INTERVAL_MINUTES } from "@/config/approved-sources";
import { SAMPLE_DATASETS, type SampleDatasetName } from "@/data/sample/datasets";
import type { SourceAdapter } from "./types";

// Serves the bundled, clearly labelled sample datasets without any network
// access, so the full pipeline can be demonstrated before real sources are
// approved.
export const sampleAdapter: SourceAdapter = {
  type: "sample",
  validateConfig(source) {
    const dataset = source.integrationConfig?.dataset;
    if (!dataset || !(dataset in SAMPLE_DATASETS)) {
      throw new Error(`Sample sources need integrationConfig.dataset (${Object.keys(SAMPLE_DATASETS).join(", ")})`);
    }
  },
  minIntervalMinutes() {
    return SAMPLE_MIN_INTERVAL_MINUTES;
  },
  async fetch({ source }) {
    const dataset = SAMPLE_DATASETS[source.integrationConfig!.dataset as SampleDatasetName];
    if (dataset.kind === "items") {
      return { kind: "items", items: dataset.items.map((i) => ({ ...i })), recordErrors: [] };
    }
    return { kind: "indicators", indicators: dataset.indicators.map((i) => ({ ...i })), recordErrors: [] };
  },
};
