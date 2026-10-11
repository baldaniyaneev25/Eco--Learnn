import { describe, expect, it } from "vitest";
import { classify } from "@/lib/ingestion/classify";
import {
  canonicalizeUrl,
  containsFigures,
  contentFingerprint,
  decodeEntities,
  detectLanguage,
  htmlToText,
  truncate,
} from "@/lib/ingestion/text";
import { extractNumbers, numbersPreserved } from "@/lib/ingestion/translation";
import { looksCopied } from "@/lib/content/review";

describe("htmlToText", () => {
  it("drops scripts, styles, handlers and markup", () => {
    const html = `<p onclick="steal()">Repo rate <b>unchanged</b></p><script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><img src=x onerror=alert(1)>`;
    const text = htmlToText(html);
    expect(text).toBe("Repo rate unchanged");
    expect(text).not.toMatch(/[<>]|alert|onerror/);
  });

  it("decodes entities, including numeric ones, and keeps paragraphs", () => {
    expect(htmlToText("<p>A &amp; B</p><p>&#8377;100 &ndash; &#x0AA8;</p>")).toBe("A & B\n₹100 – ન");
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
  });

  it("does not leave angle brackets from escaped markup", () => {
    expect(htmlToText("&lt;script&gt;alert(1)&lt;/script&gt;")).not.toMatch(/[<>]/);
  });
});

describe("canonicalizeUrl", () => {
  it("removes tracking params, fragments, www and trailing slash; sorts query", () => {
    expect(canonicalizeUrl("http://WWW.RBI.org.in/Scripts/a.aspx/?b=2&utm_source=x&a=1#top")).toBe(
      "https://rbi.org.in/Scripts/a.aspx?a=1&b=2",
    );
  });
});

describe("language, fingerprint, figures", () => {
  it("detects Gujarati script", () => {
    expect(detectLanguage("અંદાજપત્રમાં મૂડી ખર્ચ પર ભાર")).toBe("gu");
    expect(detectLanguage("Budget focuses on capital expenditure")).toBe("en");
    expect(detectLanguage("1234", "gu")).toBe("gu");
  });

  it("fingerprints are stable across whitespace and case", () => {
    expect(contentFingerprint("Title", "Body  text")).toBe(contentFingerprint(" title ", "body text"));
    expect(contentFingerprint("Title", "Body")).not.toBe(contentFingerprint("Title", "Body changed"));
  });

  it("flags figures that need fact-checking", () => {
    expect(containsFigures("Inflation at 3.4%")).toBe(true);
    expect(containsFigures("₹ 500 crore allocated")).toBe(true);
    expect(containsFigures("Policy unchanged")).toBe(false);
  });

  it("truncates at word boundaries and honours zero limits", () => {
    expect(truncate("one two three four", 9)).toBe("one two…");
    expect(truncate("anything", 0)).toBe("");
  });
});

describe("classify", () => {
  it("picks the best matching economics topic", () => {
    expect(classify("RBI keeps repo rate unchanged", "Monetary policy committee decision").category).toBe("monetary-policy");
    expect(classify("CPI inflation eases", "Consumer price index fell").category).toBe("inflation");
    expect(classify("બજેટમાં રાજકોષીય ખાધનો લક્ષ્યાંક", "").category).toBe("budget");
  });

  it("falls back to general economy with zero relevance", () => {
    const r = classify("Sports news", "Cricket match result");
    expect(r.category).toBe("general-economy");
    expect(r.relevance).toBe(0);
  });

  it("only considers allowed categories", () => {
    expect(classify("Repo rate and inflation", "", ["inflation"]).category).toBe("inflation");
  });
});

describe("translation safeguards", () => {
  it("compares figures across Latin and Gujarati digits", () => {
    expect(extractNumbers("₹1,200 and 3.5%")).toEqual(["1200", "3.5"]);
    expect(numbersPreserved("GDP grew 6.8% in 2026", "જીડીપી 2026માં ૬.૮% વધ્યો")).toBe(true);
    expect(numbersPreserved("GDP grew 6.8%", "જીડીપી 8.6% વધ્યો")).toBe(false);
  });
});

describe("looksCopied", () => {
  const source =
    "The Monetary Policy Committee decided to keep the policy repo rate unchanged at its latest meeting, citing the need to watch inflation closely while supporting growth.";
  it("detects verbatim copying of the source", () => {
    expect(looksCopied(source, source)).toBe(true);
  });
  it("allows original summaries", () => {
    expect(looksCopied("The central bank held its key lending rate steady and said it will keep watching prices and growth carefully.", source)).toBe(false);
  });
});
