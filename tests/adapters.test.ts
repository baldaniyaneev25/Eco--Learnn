import { describe, expect, it } from "vitest";
import { parseFeed } from "@/lib/ingestion/adapters/rss";
import { parseWorldBankResponse } from "@/lib/ingestion/adapters/worldbank";

const RSS = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Press Releases</title>
    <item>
      <title>Monetary Policy Statement &amp; Resolution</title>
      <link>https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=1</link>
      <guid>prid-1</guid>
      <pubDate>Wed, 01 Oct 2026 10:00:00 +0530</pubDate>
      <description><![CDATA[<p>The MPC kept the <b>repo rate</b> at 5.5%.</p><script>alert(1)</script>]]></description>
    </item>
    <item>
      <title>Off-domain item</title>
      <link>https://evil.example.com/phish</link>
      <guid>bad-1</guid>
    </item>
    <item>
      <link>https://www.rbi.org.in/x</link>
      <guid>no-title</guid>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>tag:pib.gov.in,2026:1</id>
    <title type="html">GDP estimates released</title>
    <link rel="alternate" href="https://pib.gov.in/PressReleasePage.aspx?PRID=1"/>
    <updated>2026-08-29T12:00:00Z</updated>
    <summary>Real GDP grew 6.8 per cent.</summary>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS items, strips markup and rejects bad records", () => {
    const { items, recordErrors } = parseFeed(RSS);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: "prid-1",
      title: "Monetary Policy Statement & Resolution",
      text: "The MPC kept the repo rate at 5.5%.",
    });
    expect(items[0].publishedAt?.toISOString()).toBe("2026-10-01T04:30:00.000Z");
    expect(recordErrors.map((e) => e.externalId).sort()).toEqual(["bad-1", "no-title"]);
    expect(recordErrors.find((e) => e.externalId === "bad-1")?.message).toMatch(/allowlist/);
  });

  it("parses Atom entries", () => {
    const { items } = parseFeed(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://pib.gov.in/PressReleasePage.aspx?PRID=1");
    expect(items[0].text).toBe("Real GDP grew 6.8 per cent.");
  });

  it("refuses documents with DOCTYPE / entity declarations (XXE, entity bombs)", () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel><item><title>&x;</title></item></channel></rss>`;
    expect(() => parseFeed(xxe)).toThrow(/DOCTYPE/);
  });

  it("rejects non-feed documents", () => {
    expect(() => parseFeed("<html><body>hi</body></html>")).toThrow(/Not an RSS or Atom/);
  });
});

describe("parseWorldBankResponse", () => {
  const response = [
    { page: 1, pages: 1, per_page: 10, total: 3, sourceid: "2", lastupdated: "2026-07-01" },
    [
      { indicator: { id: "FP.CPI.TOTL.ZG", value: "Inflation, consumer prices (annual %)" }, country: { id: "IN", value: "India" }, countryiso3code: "IND", date: "2026", value: null },
      { indicator: { id: "FP.CPI.TOTL.ZG", value: "Inflation, consumer prices (annual %)" }, country: { id: "IN", value: "India" }, countryiso3code: "IND", date: "2025", value: 4.1 },
      { indicator: { id: "FP.CPI.TOTL.ZG", value: "Inflation, consumer prices (annual %)" }, country: { id: "IN", value: "India" }, countryiso3code: "IND", date: "2024", value: 4.95 },
    ],
  ];

  it("converts observations, skips unpublished years and labels values as estimates", () => {
    const { indicators, recordErrors } = parseWorldBankResponse(response, "FP.CPI.TOTL.ZG");
    expect(recordErrors).toHaveLength(0);
    expect(indicators.map((i) => i.referencePeriod)).toEqual(["2025", "2024"]);
    expect(indicators[0]).toMatchObject({
      indicatorCode: "WB.FP.CPI.TOTL.ZG",
      value: 4.1,
      unit: "% change, annual",
      frequency: "annual",
      geography: "India",
      revisionStatus: "estimate",
      sourceUrl: "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=IN",
    });
    expect(indicators[0].releaseDate?.toISOString().slice(0, 10)).toBe("2026-07-01");
  });

  it("rejects indicators outside the approved catalogue and API error payloads", () => {
    expect(() => parseWorldBankResponse(response, "XX.UNKNOWN")).toThrow(/approved catalogue/);
    expect(() => parseWorldBankResponse([{ message: [{ id: "120", value: "Invalid value" }] }], "FP.CPI.TOTL.ZG")).toThrow(/API error/);
  });
});
