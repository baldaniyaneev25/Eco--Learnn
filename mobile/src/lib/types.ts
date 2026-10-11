// Shapes returned by the EcoLearn web backend (see app/api/* in the web project).

export type Lang = 'en' | 'gu';

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PublicItem {
  id: string;
  section: 'news' | 'current-affairs' | 'learning-resource';
  title: string;
  summary: string;
  displayLanguage: Lang;
  originalLanguage: Lang;
  isTranslation: boolean;
  translationUnavailable: boolean;
  category: string;
  classLevels: string[];
  boards: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  source: { name: string; url: string | null };
  publishedAt?: string;
  retrievedAt?: string;
  isSample: boolean;
}

export type RevisionStatus = 'provisional' | 'estimate' | 'revised' | 'final';

export interface Indicator {
  id: string;
  code: string;
  name: string;
  nameGu?: string;
  description?: string;
  descriptionGu?: string;
  value: number;
  unit: string;
  referencePeriod: string;
  frequency: string;
  geography: string;
  revisionStatus: RevisionStatus;
  source: { name: string; url: string | null };
  releaseDate?: string;
  lastUpdated?: string;
  isSample: boolean;
}

export interface IndicatorSeries {
  latest: Indicator | null;
  series: Indicator[];
  revisions: Indicator[];
}

export interface Meta {
  categories: { code: string; label: Record<Lang, string> }[];
  boards: string[];
  classLevels: string[];
  difficulties: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'editor' | 'admin';
  board?: string;
  classLevel?: string;
  preferredLanguage?: Lang;
}
