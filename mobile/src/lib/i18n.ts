import type { Lang } from './types';

const STRINGS = {
  appName: { en: 'EcoLearn', gu: 'ઇકોલર્ન' },
  news: { en: 'News', gu: 'સમાચાર' },
  newsTitle: { en: 'Economics News', gu: 'અર્થશાસ્ત્ર સમાચાર' },
  affairs: { en: 'Current Affairs', gu: 'વર્તમાન પ્રવાહો' },
  economy: { en: 'Economy', gu: 'અર્થતંત્ર' },
  economyTitle: { en: 'Indian Economy', gu: 'ભારતીય અર્થતંત્ર' },
  resources: { en: 'Resources', gu: 'સંસાધનો' },
  resourcesTitle: { en: 'Learning Resources', gu: 'અભ્યાસ સંસાધનો' },
  profile: { en: 'Profile', gu: 'પ્રોફાઇલ' },
  all: { en: 'All', gu: 'બધા' },
  source: { en: 'Source', gu: 'સ્ત્રોત' },
  published: { en: 'Published', gu: 'પ્રકાશિત' },
  readOriginal: { en: 'Read original at source', gu: 'મૂળ સ્ત્રોત પર વાંચો' },
  sampleData: { en: 'Sample data', gu: 'નમૂનો ડેટા' },
  noSourceLink: { en: 'Sample item — no external source', gu: 'નમૂનો — કોઈ બાહ્ય સ્ત્રોત નથી' },
  translationUnavailable: {
    en: 'English version not yet reviewed — showing original language.',
    gu: 'ગુજરાતી અનુવાદ હજુ સમીક્ષા હેઠળ છે — મૂળ ભાષામાં બતાવ્યું છે.',
  },
  translatedNote: {
    en: 'Translated by EcoLearn editors. Not an official publication of the source.',
    gu: 'ઇકોલર્ન સંપાદકો દ્વારા અનુવાદિત. સ્ત્રોતનું સત્તાવાર પ્રકાશન નથી.',
  },
  summaryNote: {
    en: 'Summary written by EcoLearn editors. Refer to the source for the full text.',
    gu: 'સારાંશ ઇકોલર્ન સંપાદકો દ્વારા લખાયેલ છે. સંપૂર્ણ લખાણ માટે સ્ત્રોત જુઓ.',
  },
  loading: { en: 'Loading…', gu: 'લોડ થઈ રહ્યું છે…' },
  empty: { en: 'Nothing published here yet.', gu: 'અહીં હજુ કંઈ પ્રકાશિત થયું નથી.' },
  error: { en: 'Could not load data', gu: 'ડેટા લોડ થઈ શક્યો નહીં' },
  retry: { en: 'Retry', gu: 'ફરી પ્રયાસ કરો' },
  forClass: { en: 'Class', gu: 'ધોરણ' },
  referencePeriod: { en: 'Period', gu: 'સમયગાળો' },
  lastUpdated: { en: 'Updated', gu: 'અપડેટ' },
  released: { en: 'Released', gu: 'જાહેર' },
  geography: { en: 'Area', gu: 'વિસ્તાર' },
  history: { en: 'Show history', gu: 'ઇતિહાસ બતાવો' },
  hideHistory: { en: 'Hide history', gu: 'ઇતિહાસ છુપાવો' },
  revisions: { en: 'Earlier published values', gu: 'અગાઉ પ્રકાશિત મૂલ્યો' },
  indicatorNote: {
    en: 'Each figure has its own period and source. Do not compare figures from different periods or sources directly.',
    gu: 'દરેક આંકડાનો પોતાનો સમયગાળો અને સ્ત્રોત છે. જુદા સમયગાળા કે સ્ત્રોતના આંકડા સીધા સરખાવશો નહીં.',
  },
  provisional: { en: 'Provisional', gu: 'કામચલાઉ' },
  estimate: { en: 'Estimate', gu: 'અંદાજ' },
  revised: { en: 'Revised', gu: 'સુધારેલ' },
  final: { en: 'Final', gu: 'અંતિમ' },
  beginner: { en: 'Beginner', gu: 'પ્રારંભિક' },
  intermediate: { en: 'Intermediate', gu: 'મધ્યમ' },
  advanced: { en: 'Advanced', gu: 'ઉચ્ચ' },
  language: { en: 'Language', gu: 'ભાષા' },
  board: { en: 'Board', gu: 'બોર્ડ' },
  class: { en: 'Class', gu: 'ધોરણ' },
  preferences: { en: 'Preferences', gu: 'પસંદગીઓ' },
  account: { en: 'Account', gu: 'ખાતું' },
  signIn: { en: 'Sign in', gu: 'લૉગિન' },
  signOut: { en: 'Sign out', gu: 'લૉગઆઉટ' },
  createAccount: { en: 'Create account', gu: 'ખાતું બનાવો' },
  haveAccount: { en: 'Already have an account? Sign in', gu: 'ખાતું છે? લૉગિન કરો' },
  noAccount: { en: 'New here? Create an account', gu: 'નવા છો? ખાતું બનાવો' },
  name: { en: 'Name', gu: 'નામ' },
  email: { en: 'Email', gu: 'ઇમેઇલ' },
  password: { en: 'Password', gu: 'પાસવર્ડ' },
  passwordHint: { en: 'At least 8 characters', gu: 'ઓછામાં ઓછા 8 અક્ષર' },
  signedInAs: { en: 'Signed in as', gu: 'લૉગિન થયેલ' },
  guestNote: {
    en: 'You can read everything without an account. Sign in to save your preferences across devices.',
    gu: 'ખાતા વિના પણ બધું વાંચી શકો છો. પસંદગીઓ સાચવવા લૉગિન કરો.',
  },
  server: { en: 'Server', gu: 'સર્વર' },
  sampleNotice: {
    en: 'Items marked “Sample data” are demonstration content, not real publications or official figures.',
    gu: '“નમૂનો ડેટા” તરીકે ચિહ્નિત સામગ્રી નિદર્શન માટે છે, વાસ્તવિક પ્રકાશન કે સત્તાવાર આંકડા નથી.',
  },
  articleTitle: { en: 'Article', gu: 'લેખ' },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}

export function formatDate(value: string | undefined | null, lang: Lang, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'gu' ? 'gu-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatNumber(value: number, lang: Lang): string {
  return value.toLocaleString(lang === 'gu' ? 'gu-IN' : 'en-IN', { maximumFractionDigits: 2 });
}
