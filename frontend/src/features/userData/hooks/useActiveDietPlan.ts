import { useEffect, useState } from 'react';
import { getActiveDietPlan } from '../api';
import type { ActiveDietPlan } from '../types';

interface ActiveDietPlanState {
  plan: ActiveDietPlan | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActiveDietPlan(): ActiveDietPlanState {
  const [plan, setPlan] = useState<ActiveDietPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    try {
      const next = await getActiveDietPlan();
      setPlan(next.plan);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar tu plan');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);
  return { plan, isLoading, error, refresh };
}
