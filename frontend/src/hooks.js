import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { api } from './api';

/** Charge des données à chaque fois que l'écran reprend le focus. */
export function useFocusFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setData(await fetcherRef.current());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { load(); }, [load, ...deps]));

  return { data, setData, loading, refreshing, error, reload: load, refresh: () => load(true) };
}

export const fetchCompany = () => api.get('/company/').then((r) => r.data);
