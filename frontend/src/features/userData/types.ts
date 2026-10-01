export interface DashboardSummaryCard {
  label: string;
  value: string;
  detail: string;
  tone: 'neutral' | 'positive' | 'warning' | string;
}

export interface MetricPoint {
  x: string;
  value: number;
  recorded_at: string;
}

export interface MetricSeries {
  metric_type: string;
  label: string;
  unit: string | null;
  trend_label: string;
  change_label: string;
  points: MetricPoint[];
}

export interface PreferenceItem {
  preference_id: string;
  category: string;
  label: string;
  value: string;
  importance: number;
  status: string;
  source: string;
  metadata_json: Record<string, unknown>;
}

export interface PreferenceGroup {
  category: string;
  title: string;
  items: PreferenceItem[];
}

export interface NutritionFocusItem {
  title: string;
  detail: string;
  status: 'active' | 'guardrail' | 'planned' | string;
}

export interface HealthOverview {
  summary_cards: DashboardSummaryCard[];
  metrics: MetricSeries[];
  preference_groups: PreferenceGroup[];
  nutrition_focus: NutritionFocusItem[];
}

export interface CreateMetricEntryInput {
  metric_type: string;
  label: string;
  value_number?: number | null;
  value_text?: string | null;
  unit?: string | null;
  recorded_at?: string;
  notes?: string | null;
}

export interface MetricEntry extends CreateMetricEntryInput {
  metric_entry_id: string;
  source: string;
  metadata_json: Record<string, unknown>;
}

export interface UserSettings {
  theme: string;
  sidebar_collapsed: boolean;
  default_workspace_id: string;
  density: string;
  preferred_language: 'es' | 'en';
  ui_preferences: Record<string, unknown>;
}

export interface DietPlanFoodItem {
  name: string;
  quantity?: number | null;
  unit?: string | null;
}

export interface DietPlanMeal {
  name: string;
  food_items?: DietPlanFoodItem[];
}

export interface DietPlanDay {
  day?: string;
  focus?: string;
  calories?: number | string;
  meals?: DietPlanMeal[];
}

export interface DietPlanDocument {
  description?: string;
  targets?: {
    calories_kcal?: number;
    protein_g?: number;
    carbohydrate_g?: number;
    fat_g?: number;
  };
  meals?: DietPlanMeal[];
  days?: DietPlanDay[];
}

export interface ActiveDietPlan {
  plan_id: string;
  status: string;
  active_revision_id: string;
  updated_at: string;
  revision_id: string;
  revision_number: number;
  created_at: string;
  profile_snapshot: unknown;
  plan_json: DietPlanDocument;
}

export interface ActiveDietPlanResponse {
  plan: ActiveDietPlan | null;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodSearchResult {
  food_id: number;
  name: string;
  source_name?: string;
  category: string | null;
  calories_kcal: number | string | null;
  protein_g: number | string | null;
  fat_g: number | string | null;
  carbohydrate_g: number | string | null;
  fiber_g?: number | string | null;
  sugars_g?: number | string | null;
}

export type FoodSearchMode = 'lexical';

export interface FoodSearchResponse {
  mode: FoodSearchMode;
  results: FoodSearchResult[];
}

export interface FoodDetail extends FoodSearchResult {
  food_group?: string | null;
  food_subgroup?: string | null;
  public_id?: string | null;
  nutrients: FoodNutrient[];
}

export interface FoodNutrient {
  nutrient_id: number;
  name: string;
  unit_name: string;
  amount_per_100g: number | string;
  observation_count: number;
  raw_observation_count: number;
}

export interface MealLogDaySummary {
  consumed_on: string;
  entry_count: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
}

export interface DailyNutrientTotal {
  nutrient_id: number;
  name: string;
  unit_name: string;
  display_rank: number | string | null;
  total_amount: number;
}

export interface MealLogEntry {
  meal_log_entry_id: string;
  consumed_on: string;
  meal_type: MealType;
  food_id: number;
  description_snapshot: string;
  quantity: number;
  serving_grams: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  sugars_g: number;
  notes: string | null;
}

export interface MealLogDayDetail {
  consumed_on: string;
  entries: MealLogEntry[];
  totals: {
    calories_kcal: number;
    protein_g: number;
    fat_g: number;
    carbohydrate_g: number;
    fiber_g: number;
    sugars_g: number;
    nutrients: DailyNutrientTotal[];
  };
  targets: { protein_g: number; carbohydrate_g: number; fat_g: number } | null;
  completion: { protein_percent: number; carbohydrate_percent: number; fat_percent: number; overall_percent: number } | null;
}

export interface MealLogCalendarResponse {
  from: string;
  to: string;
  days: MealLogDaySummary[];
}

export interface CreateMealLogEntryInput {
  meal_type: MealType;
  food_id: number;
  quantity: number;
  serving_grams: number;
  notes?: string | null;
}

export interface UpdateMealLogEntryInput {
  meal_type?: MealType;
  quantity?: number;
  serving_grams?: number;
  notes?: string | null;
}
