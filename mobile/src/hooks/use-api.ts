import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';

/**
 * Loads one resource; reloads when `path` or `key` changes, and (optionally)
 * whenever the screen comes back into focus, e.g. after finishing a quiz.
 * `null` path = wait.
 */
export function useApi<T>(path: string | null, { key = '', refetchOnFocus = false }: { key?: string; refetchOnFocus?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const isRefresh = useRef(false);
  const focusedOnce = useRef(false);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    if (!isRefresh.current) setLoading(true);
    api<T>(path)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
        isRefresh.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [path, key, nonce]);

  const refresh = useCallback(() => {
    isRefresh.current = true;
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  // Quietly reload when returning to the screen (skips the first focus, which the effect above covers).
  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      isRefresh.current = true;
      setNonce((n) => n + 1);
    }, [refetchOnFocus]),
  );

  return { data, error, loading, refreshing, refresh };
}
