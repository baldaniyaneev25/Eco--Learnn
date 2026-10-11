"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface LoaderState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Runs `load` on mount and whenever `deps` change (compared by value), and
 * ignores responses that arrive after a newer request has started.
 */
export function useLoader<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<LoaderState<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const key = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    // Mark as loading while keeping previous data visible.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true }));
    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err: Error) => {
        if (!cancelled) setState((s) => ({ ...s, error: err.message, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
