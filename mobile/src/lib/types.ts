// Shapes returned by the EcoLearn web backend (app/api/study/* and app/api/auth/*).

export type Lang = 'en' | 'gu';
export type Bi = { en: string; gu: string };

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'editor' | 'admin';
  board: string;
  classLevel: string;
  preferredLanguage: Lang;
}

export interface Meta {
  boards: string[];
  classLevels: string[];
}

export interface ChapterSummary {
  id: string;
  order: number;
  title: Bi;
  description: Bi;
  notesTotal: number;
  notesRead: number;
  quizzes: number;
}

export interface QuizSummary {
  id: string;
  kind: 'practice' | 'test';
  chapterId: string | null;
  title: Bi;
  description: Bi;
  questionCount: number;
  durationMinutes: number | null;
  bestPercent: number | null;
  attempts: number;
  hasRunningAttempt?: boolean;
}

export interface ChapterDetail {
  id: string;
  title: Bi;
  description: Bi;
  notes: { id: string; title: Bi; hasPdf: boolean; read: boolean }[];
  quizzes: QuizSummary[];
}

export interface NoteDetail {
  id: string;
  chapter: { id: string; title: Bi };
  title: Bi;
  body: Bi;
  pdfUrl: Bi;
  read: boolean;
  previousId: string | null;
  nextId: string | null;
}

export interface AttemptStart {
  attemptId: string;
  quiz: QuizSummary;
  startedAt: string;
  deadlineAt: string | null;
  serverNow: string;
  questions: { id: string; text: Bi; options: Bi[] }[];
}

export interface AttemptResult {
  status: 'submitted' | 'expired';
  attemptId: string;
  quizId: string;
  kind: 'practice' | 'test';
  title: Bi;
  score: number;
  total: number;
  percent: number;
  submittedAt: string;
  review: { text: Bi; options: Bi[]; chosen: number | null; correctIndex: number; isCorrect: boolean; explanation: Bi }[];
}

export interface Dashboard {
  totals: {
    chapters: number;
    notesTotal: number;
    notesRead: number;
    quizzesTaken: number;
    testsTaken: number;
    averagePercent: number | null;
  };
  continueChapter: ChapterSummary | null;
  weakChapters: { id: string; title: Bi; averagePercent: number | null }[];
  chapterProgress: { id: string; title: Bi; notesRead: number; notesTotal: number; averagePercent: number | null; attempts: number }[];
  recentAttempts: { attemptId: string; kind: 'practice' | 'test'; title: Bi; percent: number; score: number; total: number; status: string; submittedAt: string }[];
}
