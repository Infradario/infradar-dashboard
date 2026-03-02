import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number,
  deps: unknown[] = []
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);

  const doFetch = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      if (!silent) setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);

    doFetch(false);

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          doFetch(true);
        }
      }, interval);
    };

    startPolling();

    const onVisibility = () => {
      if (!document.hidden) {
        doFetch(true);
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, interval]);

  const refresh = useCallback(() => {
    doFetch(true);
  }, [doFetch]);

  return { data, loading, error, lastUpdated, refresh };
}
