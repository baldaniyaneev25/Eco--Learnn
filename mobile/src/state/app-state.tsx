import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuthToken, setUnauthorizedHandler } from '@/lib/api';
import { load, save } from '@/lib/storage';
import type { Lang, Meta, User } from '@/lib/types';

interface AppState {
  ready: boolean;
  user: User | null;
  lang: Lang;
  meta: Meta;
  setLang: (lang: Lang) => void;
  updateStudy: (patch: { board?: string; classLevel?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; board: string; classLevel: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const LANG_KEY = 'ecolearn.lang';
const TOKEN_KEY = 'ecolearn.token';
const DEFAULT_META: Meta = { boards: ['GSEB', 'CBSE'], classLevels: ['9', '10', '11', '12'] };

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLangState] = useState<Lang>('gu');
  const [meta, setMeta] = useState<Meta>(DEFAULT_META);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await save(TOKEN_KEY, null);
  }, []);

  // Restore language and session from secure storage.
  useEffect(() => {
    let cancelled = false;
    setUnauthorizedHandler(() => void signOut());
    (async () => {
      const [storedLang, token] = await Promise.all([load<Lang>(LANG_KEY), load<string>(TOKEN_KEY)]);
      if (cancelled) return;
      if (storedLang === 'en' || storedLang === 'gu') setLangState(storedLang);
      if (token) {
        setAuthToken(token);
        try {
          const { user } = await api<{ user: User | null }>('/api/auth/me');
          if (cancelled) return;
          if (user) setUser(user);
          else await signOut();
        } catch {
          // Offline: stay signed out for now; the token is kept for the next launch.
          setAuthToken(null);
        }
      }
      if (!cancelled) setReady(true);
    })();
    api<Meta>('/api/meta')
      .then((m) => !cancelled && setMeta({ boards: m.boards, classLevels: m.classLevels }))
      .catch(() => {});
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, [signOut]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      void save(LANG_KEY, next);
      if (user) void api('/api/auth/me', { method: 'PATCH', json: { preferredLanguage: next } }).catch(() => {});
    },
    [user],
  );

  /** Board/class decide which chapters and quizzes the server returns. */
  const updateStudy = useCallback(async (patch: { board?: string; classLevel?: string }) => {
    const { user: updated } = await api<{ user: User }>('/api/auth/me', { method: 'PATCH', json: patch });
    setUser((u) => (u ? { ...u, ...updated } : u));
  }, []);

  const startSession = useCallback(async (token: string) => {
    setAuthToken(token);
    await save(TOKEN_KEY, token);
    const { user } = await api<{ user: User | null }>('/api/auth/me');
    setUser(user);
    if (user?.preferredLanguage) {
      setLangState(user.preferredLanguage);
      await save(LANG_KEY, user.preferredLanguage);
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token } = await api<{ token: string }>('/api/auth/login', { method: 'POST', json: { email, password, client: 'mobile' } });
      await startSession(token);
    },
    [startSession],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; board: string; classLevel: string }) => {
      const { token } = await api<{ token: string }>('/api/auth/register', {
        method: 'POST',
        json: { ...input, client: 'mobile', preferredLanguage: lang },
      });
      await startSession(token);
    },
    [lang, startSession],
  );

  const value = useMemo<AppState>(
    () => ({ ready, user, lang, meta, setLang, updateStudy, signIn, register, signOut }),
    [ready, user, lang, meta, setLang, updateStudy, signIn, register, signOut],
  );
  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppState {
  const ctx = use(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** Changes whenever the student's class/board changes, so study screens reload. */
export function useStudyKey(): string {
  const { user } = useApp();
  return user ? `${user.board}-${user.classLevel}` : 'none';
}
