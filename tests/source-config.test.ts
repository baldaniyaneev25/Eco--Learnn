import { describe, expect, it } from "vitest";
import { CreateSourceSchema, UpdateSourceSchema, validateSourceConfig } from "@/lib/admin/sources";

const rss = {
  name: "RBI press releases",
  sourceType: "rss",
  baseUrl: "https://www.rbi.org.in",
  integrationConfig: { feedUrl: "https://www.rbi.org.in/pressreleases_rss.xml" },
  fetchIntervalMinutes: 60,
};

describe("data source configuration", () => {
  it("a partial update does not reset omitted fields to defaults", () => {
    expect(UpdateSourceSchema.parse({ isEnabled: true })).toEqual({ isEnabled: true });
  });

  it("caps content policy and validates against the allowlist", () => {
    const input = CreateSourceSchema.parse(rss);
    const fields = validateSourceConfig(input, "admin@test");
    expect(fields).toMatchObject({ baseUrl: "https://www.rbi.org.in", isEnabled: false, isSample: false, categories: [] });
  });

  it("rejects feeds on a different organisation's domain than the base URL", () => {
    const input = CreateSourceSchema.parse({
      ...rss,
      integrationConfig: { feedUrl: "https://pib.gov.in/RssMain.aspx" },
    });
    expect(() => validateSourceConfig(input, "admin@test")).toThrow(/same approved organisation/);
  });

  it("rejects secret values in integrationConfig and accepts env var names", () => {
    expect(() => CreateSourceSchema.parse({ ...rss, integrationConfig: { ...rss.integrationConfig, apiKeyEnv: "sk-live-123" } })).toThrow();
    expect(CreateSourceSchema.parse({ ...rss, integrationConfig: { ...rss.integrationConfig, apiKeyEnv: "RBI_API_KEY" } })).toBeTruthy();
  });

  it("enforces the per-domain minimum interval and terms review before enabling", () => {
    expect(() => validateSourceConfig(CreateSourceSchema.parse({ ...rss, fetchIntervalMinutes: 10 }), "a")).toThrow(/at least 60/);
    expect(() => validateSourceConfig(CreateSourceSchema.parse({ ...rss, isEnabled: true }), "a")).toThrow(/terms of use/);
    const ok = validateSourceConfig(
      CreateSourceSchema.parse({ ...rss, isEnabled: true, accessReview: { termsReviewed: true } }),
      "admin@test",
    );
    expect(ok.accessReview).toMatchObject({ termsReviewed: true, reviewedBy: "admin@test" });
  });

  it("only allows catalogued World Bank indicators", () => {
    const wb = { name: "World Bank", sourceType: "worldbank", integrationConfig: { country: "IND" }, fetchIntervalMinutes: 1440 };
    expect(() => validateSourceConfig(CreateSourceSchema.parse({ ...wb, integrationConfig: { country: "IND", indicators: ["XX.BAD"] } }), "a")).toThrow(
      /approved catalogue/,
    );
    expect(
      validateSourceConfig(CreateSourceSchema.parse({ ...wb, integrationConfig: { country: "IND", indicators: ["FP.CPI.TOTL.ZG"] } }), "a").baseUrl,
    ).toBe("https://api.worldbank.org");
  });
});
