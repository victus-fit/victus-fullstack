import { useCallback, useEffect, useState } from 'react';
import { getMealLogDay } from '../api';
import type { MealLogDayDetail } from '../types';

export function useMealLogDay(date: string) {
  const [data, setData] = useState<MealLogDayDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await getMealLogDay(date));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el registro del día');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, isLoading, error, refresh };
}
