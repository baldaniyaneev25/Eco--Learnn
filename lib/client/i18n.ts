export type Lang = "en" | "gu";

const STRINGS = {
  appName: { en: "EcoLearn", gu: "ઇકોલર્ન" },
  tagline: { en: "Learn economics in Gujarati and English", gu: "ગુજરાતી અને અંગ્રેજીમાં અર્થશાસ્ત્ર શીખો" },
  home: { en: "Home", gu: "મુખ્ય પૃષ્ઠ" },
  news: { en: "Economics News", gu: "અર્થશાસ્ત્ર સમાચાર" },
  currentAffairs: { en: "Current Affairs", gu: "વર્તમાન પ્રવાહો" },
  economy: { en: "Indian Economy Dashboard", gu: "ભારતીય અર્થતંત્ર ડેશબોર્ડ" },
  resources: { en: "Learning Resources", gu: "અભ્યાસ સંસાધનો" },
  language: { en: "Language", gu: "ભાષા" },
  board: { en: "Board", gu: "બોર્ડ" },
  class: { en: "Class", gu: "ધોરણ" },
  allCategories: { en: "All topics", gu: "બધા વિષયો" },
  source: { en: "Source", gu: "સ્ત્રોત" },
  published: { en: "Published", gu: "પ્રકાશિત" },
  readOriginal: { en: "Read original at source", gu: "મૂળ સ્ત્રોત પર વાંચો" },
  sampleData: { en: "Sample data", gu: "નમૂનો ડેટા" },
  sampleNotice: {
    en: "Items marked “Sample data” are demonstration content, not real publications or official figures.",
    gu: "“નમૂનો ડેટા” તરીકે ચિહ્નિત સામગ્રી નિદર્શન માટે છે, વાસ્તવિક પ્રકાશન કે સત્તાવાર આંકડા નથી.",
  },
  noSourceLink: { en: "Sample item — no external source", gu: "નમૂનો — કોઈ બાહ્ય સ્ત્રોત નથી" },
  translationUnavailable: {
    en: "English version not yet reviewed — showing original language.",
    gu: "ગુજરાતી અનુવાદ હજુ સમીક્ષા હેઠળ છે — મૂળ ભાષામાં બતાવ્યું છે.",
  },
  translatedNote: {
    en: "Translated by EcoLearn editors. Not an official publication of the source.",
    gu: "ઇકોલર્ન સંપાદકો દ્વારા અનુવાદિત. સ્ત્રોતનું સત્તાવાર પ્રકાશન નથી.",
  },
  summaryNote: {
    en: "Summary written by EcoLearn editors. Refer to the source for the full text.",
    gu: "સારાંશ ઇકોલર્ન સંપાદકો દ્વારા લખાયેલ છે. સંપૂર્ણ લખાણ માટે સ્ત્રોત જુઓ.",
  },
  loading: { en: "Loading…", gu: "લોડ થઈ રહ્યું છે…" },
  empty: { en: "Nothing published here yet.", gu: "અહીં હજુ કંઈ પ્રકાશિત થયું નથી." },
  error: { en: "Could not load data.", gu: "ડેટા લોડ થઈ શક્યો નહીં." },
  retry: { en: "Retry", gu: "ફરી પ્રયાસ કરો" },
  previous: { en: "Previous", gu: "પાછળ" },
  next: { en: "Next", gu: "આગળ" },
  page: { en: "Page", gu: "પાનું" },
  from: { en: "From", gu: "થી" },
  to: { en: "To", gu: "સુધી" },
  referencePeriod: { en: "Reference period", gu: "સંદર્ભ સમયગાળો" },
  unit: { en: "Unit", gu: "એકમ" },
  lastUpdated: { en: "Last updated", gu: "છેલ્લે અપડેટ" },
  released: { en: "Released", gu: "જાહેર" },
  history: { en: "History", gu: "ઇતિહાસ" },
  hideHistory: { en: "Hide history", gu: "ઇતિહાસ છુપાવો" },
  revisions: { en: "Earlier published values (revised)", gu: "અગાઉ પ્રકાશિત મૂલ્યો (સુધારેલા)" },
  indicatorNote: {
    en: "Each figure has its own reference period and source. Do not compare figures from different periods or sources directly.",
    gu: "દરેક આંકડાનો પોતાનો સંદર્ભ સમયગાળો અને સ્ત્રોત છે. જુદા સમયગાળા કે સ્ત્રોતના આંકડા સીધા સરખાવશો નહીં.",
  },
  provisional: { en: "Provisional", gu: "કામચલાઉ" },
  estimate: { en: "Estimate", gu: "અંદાજ" },
  revised: { en: "Revised", gu: "સુધારેલ" },
  final: { en: "Final", gu: "અંતિમ" },
  difficulty: { en: "Level", gu: "સ્તર" },
  beginner: { en: "Beginner", gu: "પ્રારંભિક" },
  intermediate: { en: "Intermediate", gu: "મધ્યમ" },
  advanced: { en: "Advanced", gu: "ઉચ્ચ" },
  forClasses: { en: "For class", gu: "ધોરણ માટે" },
  allClasses: { en: "All classes", gu: "બધા ધોરણ" },
  back: { en: "Back", gu: "પાછા" },
  modulesIntro: {
    en: "Stay up to date with the Indian economy. All content is reviewed by EcoLearn editors before it appears here.",
    gu: "ભારતીય અર્થતંત્ર વિશે અપડેટ રહો. અહીં દેખાતી બધી સામગ્રી ઇકોલર્ન સંપાદકો દ્વારા ચકાસાયેલ છે.",
  },
  latestNews: { en: "Latest news", gu: "તાજા સમાચાર" },
  seeAll: { en: "See all", gu: "બધું જુઓ" },
  adminLink: { en: "Staff login", gu: "સ્ટાફ લૉગિન" },
  geography: { en: "Geography", gu: "વિસ્તાર" },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
