import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuthToken } from '@/lib/api';
import { load, save } from '@/lib/storage';
import type { Lang, Meta, User } from '@/lib/types';

export interface Preferences {
  lang: Lang;
  board: string;
  classLevel: string;
}

interface AppState extends Preferences {
  ready: boolean;
  user: User | null;
  meta: Meta | null;
  updatePrefs: (patch: Partial<Preferences>) => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_PREFS: Preferences = { lang: 'gu', board: 'GSEB', classLevel: '12' };
const PREFS_KEY = 'ecolearn.prefs';
const TOKEN_KEY = 'ecolearn.token';

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [user, setUser] = useState<User | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [ready, setReady] = useState(false);

  // Restore preferences and session from secure storage, then refresh from the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedPrefs, token] = await Promise.all([load<Preferences>(PREFS_KEY), load<string>(TOKEN_KEY)]);
      if (cancelled) return;
      if (storedPrefs) setPrefs((p) => ({ ...p, ...storedPrefs }));
      if (token) {
        setAuthToken(token);
        try {
          const { user } = await api<{ user: User | null }>('/api/auth/me');
          if (!cancelled) setUser(user);
          if (!user) {
            setAuthToken(null);
            await save(TOKEN_KEY, null);
          }
        } catch {
          // offline: keep the token and try again next launch
        }
      }
      if (!cancelled) setReady(true);
    })();
    api<Meta>('/api/meta')
      .then((m) => !cancelled && setMeta(m))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(
    (patch: Partial<Preferences>) => {
      setPrefs((p) => {
        const next = { ...p, ...patch };
        void save(PREFS_KEY, next);
        return next;
      });
      if (user) {
        void api('/api/auth/me', {
          method: 'PATCH',
          json: {
            ...(patch.board ? { board: patch.board } : {}),
            ...(patch.classLevel ? { classLevel: patch.classLevel } : {}),
            ...(patch.lang ? { preferredLanguage: patch.lang } : {}),
          },
        }).catch(() => {});
      }
    },
    [user],
  );

  const startSession = useCallback(async (token: string) => {
    setAuthToken(token);
    await save(TOKEN_KEY, token);
    const { user } = await api<{ user: User | null }>('/api/auth/me');
    setUser(user);
    if (user?.preferredLanguage && user.board && user.classLevel) {
      const next = { lang: user.preferredLanguage, board: user.board, classLevel: user.classLevel };
      setPrefs(next);
      await save(PREFS_KEY, next);
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token } = await api<{ token: string }>('/api/auth/login', {
        method: 'POST',
        json: { email, password, client: 'mobile' },
      });
      await startSession(token);
    },
    [startSession],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const { token } = await api<{ token: string }>('/api/auth/register', {
        method: 'POST',
        json: {
          ...input,
          client: 'mobile',
          board: prefs.board,
          classLevel: prefs.classLevel,
          preferredLanguage: prefs.lang,
        },
      });
      await startSession(token);
    },
    [prefs, startSession],
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await save(TOKEN_KEY, null);
  }, []);

  const value = useMemo<AppState>(
    () => ({ ...prefs, ready, user, meta, updatePrefs, signIn, register, signOut }),
    [prefs, ready, user, meta, updatePrefs, signIn, register, signOut],
  );
  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppState {
  const ctx = use(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function useCategoryLabel() {
  const { meta, lang } = useApp();
  return (code: string) => meta?.categories.find((c) => c.code === code)?.label[lang] ?? code;
}
