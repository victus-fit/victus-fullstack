import { apiFetch } from '../../lib/api';
import type {
  CreateMealLogEntryInput,
  ActiveDietPlanResponse,
  CreateMetricEntryInput,
  FoodDetail,
  FoodSearchResponse,
  HealthOverview,
  MealLogCalendarResponse,
  MealLogDayDetail,
  MealLogEntry,
  MetricEntry,
  UpdateMealLogEntryInput,
  UserSettings,
} from './types';

export function getHealthOverview(): Promise<HealthOverview> {
  return apiFetch<HealthOverview>('/api/users/me/health-overview');
}

export function getActiveDietPlan(): Promise<ActiveDietPlanResponse> {
  return apiFetch<ActiveDietPlanResponse>('/api/users/me/diet-plan');
}

export function createMetricEntry(input: CreateMetricEntryInput): Promise<MetricEntry> {
  return apiFetch<MetricEntry>('/api/users/me/metrics', { method: 'POST', body: JSON.stringify(input) });
}

export function getUserSettings(): Promise<UserSettings> { return apiFetch<UserSettings>('/api/users/me/settings'); }
export function updateUserSettings(input: Partial<Pick<UserSettings, 'preferred_language'>>): Promise<UserSettings> {
  return apiFetch<UserSettings>('/api/users/me/settings', { method: 'PATCH', body: JSON.stringify(input) });
}

export function searchFoods(query: string, signal?: AbortSignal): Promise<FoodSearchResponse> {
  return apiFetch<FoodSearchResponse>(`/api/foods/search?q=${encodeURIComponent(query)}&limit=12`, { signal });
}

export function getFoodDetail(foodId: number): Promise<FoodDetail> {
  return apiFetch<FoodDetail>(`/api/foods/${foodId}`);
}

export function getMealLogCalendar(from: string, to: string): Promise<MealLogCalendarResponse> {
  return apiFetch<MealLogCalendarResponse>(`/api/meal-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export function getMealLogDay(date: string): Promise<MealLogDayDetail> {
  return apiFetch<MealLogDayDetail>(`/api/meal-logs/${encodeURIComponent(date)}`);
}

export function createMealLogEntry(date: string, input: CreateMealLogEntryInput): Promise<MealLogEntry> {
  return apiFetch<MealLogEntry>(`/api/meal-logs/${encodeURIComponent(date)}/entries`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateMealLogEntry(entryId: string, input: UpdateMealLogEntryInput): Promise<MealLogEntry> {
  return apiFetch<MealLogEntry>(`/api/meal-log-entries/${encodeURIComponent(entryId)}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteMealLogEntry(entryId: string): Promise<void> {
  return apiFetch<void>(`/api/meal-log-entries/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
}
