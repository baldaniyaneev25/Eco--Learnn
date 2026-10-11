"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/client/i18n";

export interface Preferences {
  lang: Lang;
  board: string;
  classLevel: string;
}

const DEFAULTS: Preferences = { lang: "gu", board: "GSEB", classLevel: "12" };
const STORAGE_KEY = "ecolearn.prefs";

interface PrefsContextValue extends Preferences {
  update: (patch: Partial<Preferences>) => void;
  ready: boolean;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

function readStored(): Partial<Preferences> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Preferences>;
  } catch {
    return {};
  }
}

/**
 * Board, class and language selection. Stored per browser, and synced to the
 * student's account when they are signed in.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stored = readStored();
    // Initial hydration from browser storage, then the account (if signed in).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs((p) => ({ ...p, ...stored }));
    setReady(true);
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: { board: string; classLevel: string; preferredLanguage: Lang } | null } | null) => {
        if (cancelled || !data?.user) return;
        setSignedIn(true);
        if (Object.keys(stored).length === 0) {
          setPrefs({ lang: data.user.preferredLanguage, board: data.user.board, classLevel: data.user.classLevel });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = prefs.lang === "gu" ? "gu" : "en";
  }, [prefs.lang]);

  const update = useCallback(
    (patch: Partial<Preferences>) => {
      setPrefs((p) => {
        const next = { ...p, ...patch };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // storage unavailable (private mode) — keep in memory only
        }
        return next;
      });
      if (signedIn) {
        fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(patch.board ? { board: patch.board } : {}),
            ...(patch.classLevel ? { classLevel: patch.classLevel } : {}),
            ...(patch.lang ? { preferredLanguage: patch.lang } : {}),
          }),
        }).catch(() => {});
      }
    },
    [signedIn],
  );

  const value = useMemo(() => ({ ...prefs, update, ready }), [prefs, update, ready]);
  return <PrefsContext value={value}>{children}</PrefsContext>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PreferencesProvider");
  return ctx;
}
