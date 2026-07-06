import { apiFetch } from '../../lib/api';
import type { HealthOverview } from './types';

export function getHealthOverview(): Promise<HealthOverview> {
  return apiFetch<HealthOverview>('/api/users/me/health-overview');
}
