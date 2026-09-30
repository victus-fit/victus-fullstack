import { useEffect, useState } from 'react';
import { searchFoods } from '../api';
import type { FoodSearchMode, FoodSearchResult } from '../types';

export function useFoodSearch(query: string) {
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FoodSearchMode | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      setMode(null);
      return;
    }
    setIsLoading(false);
    let active = true;
    let didTimeout = false;
    const controller = new AbortController();
    let requestTimeout: number | undefined;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      requestTimeout = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 15_000);
      void searchFoods(term, controller.signal)
        .then((next) => { if (active) { setResults(next.results); setMode(next.mode); setError(null); } })
        .catch((caught) => {
          if (!active) return;
          if (controller.signal.aborted) {
            if (didTimeout) setError('La búsqueda tardó demasiado. Intenta de nuevo.');
            return;
          }
          setError(caught instanceof Error ? caught.message : 'No se pudo buscar alimentos');
        })
        .finally(() => {
          if (requestTimeout !== undefined) window.clearTimeout(requestTimeout);
          if (active) setIsLoading(false);
        });
    }, 400);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      if (requestTimeout !== undefined) window.clearTimeout(requestTimeout);
    };
  }, [query]);

  return { results, isLoading, error, mode };
}
