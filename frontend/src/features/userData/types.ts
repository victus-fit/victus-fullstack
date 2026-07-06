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
  read_only: boolean;
  profile_label: string | null;
  profile_note: string | null;
  summary_cards: DashboardSummaryCard[];
  metrics: MetricSeries[];
  preference_groups: PreferenceGroup[];
  nutrition_focus: NutritionFocusItem[];
}
