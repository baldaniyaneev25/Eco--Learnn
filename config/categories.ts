// Economics topic taxonomy used for classification, filtering and display.
// Keywords are matched case-insensitively against English and Gujarati text.

export const CATEGORY_CODES = [
  "inflation",
  "gdp",
  "employment",
  "budget",
  "monetary-policy",
  "government-schemes",
  "banking-finance",
  "trade",
  "agriculture",
  "curriculum",
  "general-economy",
] as const;

export type CategoryCode = (typeof CATEGORY_CODES)[number];

export interface CategoryDef {
  code: CategoryCode;
  label: { en: string; gu: string };
  keywords: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    code: "inflation",
    label: { en: "Inflation & Prices", gu: "મોંઘવારી અને ભાવ" },
    keywords: ["inflation", "cpi", "wpi", "consumer price", "wholesale price", "price index", "મોંઘવારી", "ફુગાવો", "ભાવાંક"],
  },
  {
    code: "gdp",
    label: { en: "GDP & Growth", gu: "જીડીપી અને વૃદ્ધિ" },
    keywords: ["gdp", "gross domestic product", "national income", "gva", "growth rate", "economic growth", "રાષ્ટ્રીય આવક", "આર્થિક વૃદ્ધિ", "જીડીપી"],
  },
  {
    code: "employment",
    label: { en: "Employment", gu: "રોજગાર" },
    keywords: ["employment", "unemployment", "labour force", "labor force", "plfs", "jobs", "રોજગાર", "બેરોજગારી"],
  },
  {
    code: "budget",
    label: { en: "Budget & Fiscal Policy", gu: "અંદાજપત્ર અને રાજકોષીય નીતિ" },
    keywords: ["budget", "fiscal deficit", "economic survey", "taxation", "gst", "expenditure", "બજેટ", "અંદાજપત્ર", "રાજકોષીય", "આર્થિક સર્વેક્ષણ"],
  },
  {
    code: "monetary-policy",
    label: { en: "Monetary Policy (RBI)", gu: "નાણાકીય નીતિ (RBI)" },
    keywords: ["repo rate", "monetary policy", "mpc", "reverse repo", "policy rate", "crr", "slr", "liquidity", "રેપો", "નાણાકીય નીતિ"],
  },
  {
    code: "government-schemes",
    label: { en: "Government Schemes", gu: "સરકારી યોજનાઓ" },
    keywords: ["scheme", "yojana", "mission", "programme", "pradhan mantri", "યોજના", "મિશન"],
  },
  {
    code: "banking-finance",
    label: { en: "Banking & Finance", gu: "બેન્કિંગ અને નાણાં" },
    keywords: ["bank", "banking", "credit", "loan", "nbfc", "upi", "digital payment", "બેંક", "ધિરાણ"],
  },
  {
    code: "trade",
    label: { en: "Trade & External Sector", gu: "વેપાર અને વિદેશી ક્ષેત્ર" },
    keywords: ["export", "import", "trade deficit", "forex", "foreign exchange", "current account", "fdi", "નિકાસ", "આયાત", "વિદેશી હૂંડિયામણ"],
  },
  {
    code: "agriculture",
    label: { en: "Agriculture", gu: "કૃષિ" },
    keywords: ["agriculture", "msp", "kharif", "rabi", "farmer", "crop", "કૃષિ", "ખેડૂત", "પાક"],
  },
  {
    code: "curriculum",
    label: { en: "Syllabus & Curriculum", gu: "અભ્યાસક્રમ" },
    keywords: ["syllabus", "curriculum", "ncert", "gseb", "board exam", "textbook", "અભ્યાસક્રમ", "પાઠ્યપુસ્તક"],
  },
  {
    code: "general-economy",
    label: { en: "General Economy", gu: "સામાન્ય અર્થતંત્ર" },
    keywords: [],
  },
];

export function categoryLabel(code: string, lang: "en" | "gu"): string {
  return CATEGORIES.find((c) => c.code === code)?.label[lang] ?? code;
}

export const SECTIONS = ["news", "current-affairs", "learning-resource"] as const;
export type Section = (typeof SECTIONS)[number];

export const BOARDS = ["GSEB", "CBSE"] as const;
export const CLASS_LEVELS = ["9", "10", "11", "12"] as const;
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
