import type { Bi, Lang } from './types';

const STRINGS = {
  appName: { en: 'EcoLearn', gu: 'ઇકોલર્ન' },
  tagline: { en: 'Economics notes, quizzes and tests', gu: 'અર્થશાસ્ત્રની નોંધો, ક્વિઝ અને ટેસ્ટ' },
  // Tabs
  dashboard: { en: 'Dashboard', gu: 'ડેશબોર્ડ' },
  notes: { en: 'Notes', gu: 'નોંધો' },
  quizzes: { en: 'Quizzes', gu: 'ક્વિઝ' },
  profile: { en: 'Profile', gu: 'પ્રોફાઇલ' },
  // Dashboard
  hello: { en: 'Hello', gu: 'નમસ્તે' },
  notesRead: { en: 'Notes read', gu: 'વાંચેલી નોંધો' },
  avgScore: { en: 'Average score', gu: 'સરેરાશ ગુણ' },
  quizzesTaken: { en: 'Quizzes taken', gu: 'આપેલી ક્વિઝ' },
  testsTaken: { en: 'Tests taken', gu: 'આપેલા ટેસ્ટ' },
  continueReading: { en: 'Continue reading', gu: 'વાંચન ચાલુ રાખો' },
  needsPractice: { en: 'Needs more practice', gu: 'વધુ પ્રેક્ટિસની જરૂર' },
  chapterProgress: { en: 'Chapter progress', gu: 'પ્રકરણ પ્રગતિ' },
  recentResults: { en: 'Recent results', gu: 'તાજેતરનાં પરિણામો' },
  noResultsYet: { en: 'No quizzes taken yet. Try a practice quiz!', gu: 'હજુ કોઈ ક્વિઝ આપી નથી. પ્રેક્ટિસ ક્વિઝ આપો!' },
  noChapters: {
    en: 'No chapters are published for your class yet. Check your class and board in Profile.',
    gu: 'તમારા ધોરણ માટે હજુ કોઈ પ્રકરણ પ્રકાશિત નથી. પ્રોફાઇલમાં ધોરણ અને બોર્ડ તપાસો.',
  },
  // Notes
  chapters: { en: 'Chapters', gu: 'પ્રકરણો' },
  read: { en: 'read', gu: 'વાંચ્યું' },
  practiceQuizzes: { en: 'Practice quizzes', gu: 'પ્રેક્ટિસ ક્વિઝ' },
  markRead: { en: 'Mark as read', gu: 'વાંચ્યું તરીકે ચિહ્નિત કરો' },
  markReadNext: { en: 'Mark as read & next', gu: 'વાંચ્યું — આગળ' },
  alreadyRead: { en: 'Read ✓', gu: 'વાંચ્યું ✓' },
  previous: { en: 'Previous', gu: 'પાછળ' },
  next: { en: 'Next', gu: 'આગળ' },
  openPdf: { en: 'Open PDF', gu: 'PDF ખોલો' },
  otherLanguage: { en: 'Not available in English yet — showing Gujarati.', gu: 'ગુજરાતીમાં હજુ ઉપલબ્ધ નથી — અંગ્રેજીમાં બતાવ્યું છે.' },
  // Quizzes
  practice: { en: 'Practice', gu: 'પ્રેક્ટિસ' },
  tests: { en: 'Tests', gu: 'ટેસ્ટ' },
  questions: { en: 'questions', gu: 'પ્રશ્નો' },
  minutes: { en: 'min', gu: 'મિનિટ' },
  best: { en: 'Best', gu: 'શ્રેષ્ઠ' },
  attempts: { en: 'attempts', gu: 'પ્રયાસ' },
  noQuizzes: { en: 'No quizzes available for your class yet.', gu: 'તમારા ધોરણ માટે હજુ કોઈ ક્વિઝ નથી.' },
  noTests: { en: 'No tests available for your class yet.', gu: 'તમારા ધોરણ માટે હજુ કોઈ ટેસ્ટ નથી.' },
  start: { en: 'Start', gu: 'શરૂ કરો' },
  startTest: { en: 'Start test', gu: 'ટેસ્ટ શરૂ કરો' },
  resumeTest: { en: 'Resume test', gu: 'ટેસ્ટ ફરી શરૂ કરો' },
  testRules: {
    en: 'The timer starts when you tap Start and keeps running even if you close the app. Answers are submitted automatically when time is up.',
    gu: 'Start દબાવતાં જ ટાઈમર શરૂ થશે અને એપ બંધ કરો તો પણ ચાલુ રહેશે. સમય પૂરો થતાં જવાબો આપોઆપ સબમિટ થશે.',
  },
  question: { en: 'Question', gu: 'પ્રશ્ન' },
  of: { en: 'of', gu: 'માંથી' },
  submit: { en: 'Submit', gu: 'સબમિટ કરો' },
  submitConfirmTitle: { en: 'Submit answers?', gu: 'જવાબો સબમિટ કરશો?' },
  unanswered: { en: 'unanswered question(s)', gu: 'પ્રશ્નોના જવાબ બાકી છે' },
  cancel: { en: 'Cancel', gu: 'રદ કરો' },
  timeLeft: { en: 'Time left', gu: 'બાકી સમય' },
  timeUp: { en: 'Time is up — submitting…', gu: 'સમય પૂરો — સબમિટ થઈ રહ્યું છે…' },
  // Result
  result: { en: 'Result', gu: 'પરિણામ' },
  yourScore: { en: 'Your score', gu: 'તમારા ગુણ' },
  expiredNote: {
    en: 'This test was submitted after the time limit, so the answers were not counted.',
    gu: 'આ ટેસ્ટ સમય મર્યાદા પછી સબમિટ થયો હતો, તેથી જવાબો ગણાયા નથી.',
  },
  yourAnswer: { en: 'Your answer', gu: 'તમારો જવાબ' },
  correctAnswer: { en: 'Correct answer', gu: 'સાચો જવાબ' },
  notAnswered: { en: 'Not answered', gu: 'જવાબ આપ્યો નથી' },
  explanation: { en: 'Explanation', gu: 'સમજૂતી' },
  tryAgain: { en: 'Try again', gu: 'ફરી પ્રયાસ કરો' },
  done: { en: 'Done', gu: 'પૂર્ણ' },
  // Profile & preferences
  language: { en: 'Language', gu: 'ભાષા' },
  board: { en: 'Board', gu: 'બોર્ડ' },
  class: { en: 'Class', gu: 'ધોરણ' },
  preferences: { en: 'Study settings', gu: 'અભ્યાસ સેટિંગ્સ' },
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
  server: { en: 'Server', gu: 'સર્વર' },
  // Common
  loading: { en: 'Loading…', gu: 'લોડ થઈ રહ્યું છે…' },
  error: { en: 'Could not load data', gu: 'ડેટા લોડ થઈ શક્યો નહીં' },
  retry: { en: 'Retry', gu: 'ફરી પ્રયાસ કરો' },
  empty: { en: 'Nothing here yet.', gu: 'અહીં હજુ કંઈ નથી.' },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}

/** Picks the text in the chosen language, falling back to the other one. */
export function pick(value: Bi | null | undefined, lang: Lang): string {
  if (!value) return '';
  return value[lang] || value[lang === 'en' ? 'gu' : 'en'] || '';
}

/** True when the chosen language is missing and the other one is shown instead. */
export function isFallback(value: Bi | null | undefined, lang: Lang): boolean {
  return Boolean(value && !value[lang] && value[lang === 'en' ? 'gu' : 'en']);
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
