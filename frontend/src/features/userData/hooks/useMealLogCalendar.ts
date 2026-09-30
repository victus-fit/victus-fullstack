import { useCallback, useEffect, useState } from 'react';
import { getMealLogCalendar } from '../api';
import type { MealLogCalendarResponse } from '../types';

export function useMealLogCalendar(from: string, to: string) {
  const [data, setData] = useState<MealLogCalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await getMealLogCalendar(from, to));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el calendario');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, isLoading, error, refresh };
}
