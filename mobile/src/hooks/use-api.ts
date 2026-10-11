import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import type { Paged } from '@/lib/types';

/** Loads one resource; reloads when `path` changes. `null` path = wait. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const isRefresh = useRef(false);

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
  }, [path, nonce]);

  const refresh = useCallback(() => {
    isRefresh.current = true;
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  return { data, error, loading, refreshing, refresh };
}

/**
 * Infinite list over a paginated endpoint. `buildPath(page)` returns the URL
 * for a page; changing it (e.g. a new filter) restarts from page 1.
 */
export function usePagedApi<T>(buildPath: ((page: number) => string) | null) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const key = buildPath ? buildPath(1) : null;
  const buildRef = useRef(buildPath);
  useEffect(() => {
    buildRef.current = buildPath;
  });

  // First page whenever the query (or a refresh) changes.
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    // Show the spinner while the first page for a new filter loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api<Paged<T>>(key)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPage(1);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const loadMore = useCallback(() => {
    const build = buildRef.current;
    if (!build || loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    api<Paged<T>>(build(page + 1))
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setPage(res.page);
        setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loading, loadingMore, page, totalPages]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  return { items, error, loading, loadingMore, refreshing, refresh, loadMore };
}
