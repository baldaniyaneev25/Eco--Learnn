// CLEARLY LABELLED SAMPLE DATA for demonstrations and tests.
// None of these records come from a real publication. Every item is stored
// with isSample=true and the student UI shows a "Sample data" badge. Figures
// are illustrative only and must not be cited as official statistics.

import type { RawIndicator, RawItem } from "@/lib/ingestion/adapters/types";

const BASE = "https://sample.ecolearn.invalid";

export const SAMPLE_NEWS: RawItem[] = [
  {
    externalId: "sample-news-001",
    url: `${BASE}/news/policy-rate-unchanged`,
    title: "[SAMPLE] Central bank keeps policy repo rate unchanged",
    text:
      "[Sample text for demonstration] The Monetary Policy Committee decided to keep the policy repo rate unchanged " +
      "at its latest meeting, citing the need to watch inflation closely while supporting growth.",
    language: "en",
    publishedAt: new Date("2026-10-01T05:30:00Z"),
    section: "news",
  },
  {
    externalId: "sample-news-002",
    url: `${BASE}/news/retail-inflation-eases`,
    title: "[SAMPLE] Retail inflation eases on lower vegetable prices",
    text:
      "[Sample text for demonstration] Consumer price inflation eased in the latest monthly release as food prices " +
      "moderated. Economists noted that core inflation remained stable.",
    language: "en",
    publishedAt: new Date("2026-09-12T10:00:00Z"),
    section: "news",
  },
  {
    externalId: "sample-news-003",
    url: `${BASE}/news/gu-budget-explainer`,
    title: "[નમૂનો] અંદાજપત્રમાં મૂડી ખર્ચ પર ભાર",
    text:
      "[નિદર્શન માટેનો નમૂનો] કેન્દ્રીય અંદાજપત્રમાં માળખાકીય સુવિધાઓ માટે મૂડી ખર્ચ વધારવા પર ભાર મૂકવામાં આવ્યો છે. " +
      "રાજકોષીય ખાધ ઘટાડવાનો લક્ષ્યાંક પણ જાહેર કરવામાં આવ્યો.",
    language: "gu",
    publishedAt: new Date("2026-08-20T08:00:00Z"),
    section: "current-affairs",
  },
  {
    externalId: "sample-news-004",
    url: `${BASE}/news/employment-survey`,
    title: "[SAMPLE] Quarterly labour survey shows urban unemployment steady",
    text:
      "[Sample text for demonstration] The quarterly labour force survey bulletin reported that the urban " +
      "unemployment rate was broadly steady compared with the previous quarter.",
    language: "en",
    publishedAt: new Date("2026-09-30T11:00:00Z"),
    section: "current-affairs",
  },
  {
    externalId: "sample-resource-001",
    url: `${BASE}/resources/national-income-basics`,
    title: "[SAMPLE] Understanding national income: GDP, GNP and NNP",
    text:
      "[Sample text for demonstration] A study guide introducing the concepts of national income, the difference " +
      "between GDP and GNP, and the three methods of measuring national income.",
    language: "en",
    publishedAt: new Date("2026-07-01T00:00:00Z"),
    section: "learning-resource",
  },
];

const sampleIndicator = (
  code: string,
  name: string,
  nameGu: string,
  value: number,
  unit: string,
  referencePeriod: string,
  frequency: RawIndicator["frequency"],
  revisionStatus: RawIndicator["revisionStatus"],
  description: string,
  descriptionGu: string,
): RawIndicator => ({
  indicatorCode: `SAMPLE.${code}`,
  name: `[SAMPLE] ${name}`,
  nameGu: `[નમૂનો] ${nameGu}`,
  value,
  unit,
  referencePeriod,
  frequency,
  geography: "India",
  sourceUrl: `${BASE}/indicators/${code.toLowerCase()}`,
  releaseDate: new Date("2026-10-01T00:00:00Z"),
  revisionStatus,
  description: `Illustrative sample value, not an official figure. ${description}`,
  descriptionGu: `નિદર્શન માટેનો નમૂનો, સત્તાવાર આંકડો નથી. ${descriptionGu}`,
});

export const SAMPLE_INDICATORS: RawIndicator[] = [
  sampleIndicator("CPI_YOY", "CPI inflation (year-on-year)", "ગ્રાહક ભાવ મોંઘવારી (વાર્ષિક)", 3.4, "%", "2026-08", "monthly", "provisional",
    "Change in the all-India Consumer Price Index compared with the same month last year.",
    "ગયા વર્ષના એ જ મહિનાની સરખામણીમાં અખિલ ભારતીય ગ્રાહક ભાવાંકમાં ફેરફાર."),
  sampleIndicator("CPI_YOY", "CPI inflation (year-on-year)", "ગ્રાહક ભાવ મોંઘવારી (વાર્ષિક)", 3.1, "%", "2026-07", "monthly", "final",
    "Change in the all-India Consumer Price Index compared with the same month last year.",
    "ગયા વર્ષના એ જ મહિનાની સરખામણીમાં અખિલ ભારતીય ગ્રાહક ભાવાંકમાં ફેરફાર."),
  sampleIndicator("GDP_GROWTH_Q", "Real GDP growth (quarterly, y-o-y)", "વાસ્તવિક જીડીપી વૃદ્ધિ (ત્રિમાસિક)", 6.8, "%", "2026-27 Q1", "quarterly", "estimate",
    "Growth of real GDP compared with the same quarter of the previous year.",
    "ગયા વર્ષના એ જ ત્રિમાસિકની સરખામણીમાં વાસ્તવિક જીડીપીમાં વૃદ્ધિ."),
  sampleIndicator("REPO_RATE", "Policy repo rate", "પોલિસી રેપો દર", 5.5, "% per annum", "2026-10", "monthly", "final",
    "The rate at which the central bank lends short-term funds to banks.",
    "જે દરે મધ્યસ્થ બેંક બેંકોને ટૂંકા ગાળાનું ધિરાણ આપે છે."),
  sampleIndicator("UNEMP_URBAN", "Urban unemployment rate (CWS)", "શહેરી બેરોજગારી દર (CWS)", 6.6, "% of labour force", "2026-27 Q1", "quarterly", "provisional",
    "Share of the urban labour force (age 15+) that is unemployed, current weekly status.",
    "શહેરી શ્રમબળ (15+ વય) માં બેરોજગારોનો હિસ્સો, વર્તમાન સાપ્તાહિક સ્થિતિ."),
  sampleIndicator("FISCAL_DEFICIT_BE", "Fiscal deficit (budget estimate)", "રાજકોષીય ખાધ (અંદાજપત્રીય અંદાજ)", 4.4, "% of GDP", "2026-27 BE", "annual", "estimate",
    "Budget estimate of the Union government's fiscal deficit for the financial year.",
    "નાણાકીય વર્ષ માટે કેન્દ્ર સરકારની રાજકોષીય ખાધનો અંદાજપત્રીય અંદાજ."),
];

export const SAMPLE_DATASETS = {
  "sample-news": { kind: "items" as const, items: SAMPLE_NEWS },
  "sample-indicators": { kind: "indicators" as const, indicators: SAMPLE_INDICATORS },
};

export type SampleDatasetName = keyof typeof SAMPLE_DATASETS;
