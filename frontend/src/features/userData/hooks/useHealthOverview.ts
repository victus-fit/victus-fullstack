import { useEffect, useState } from 'react';
import { getHealthOverview } from '../api';
import type { HealthOverview } from '../types';

interface HealthOverviewState {
  data: HealthOverview | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo cargar la información del usuario';
}

export function useHealthOverview(): HealthOverviewState {
  const [data, setData] = useState<HealthOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    try {
      const next = await getHealthOverview();
      setData(next);
      setError(null);
    } catch (caught) {
      setError(readError(caught));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { data, isLoading, error, refresh };
}
