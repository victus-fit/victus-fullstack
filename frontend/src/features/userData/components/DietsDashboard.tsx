import { Apple } from 'lucide-react';
import type { HealthOverview } from '../types';
import { MetricTrendCard } from './MetricTrendCard';
import { NutritionFocusList } from './NutritionFocusList';
import { PreferenceTable } from './PreferenceTable';

interface DietsDashboardProps {
  overview: HealthOverview;
}

export function DietsDashboard({ overview }: DietsDashboardProps) {
  const adherence = overview.metrics.find((metric) => metric.metric_type === 'adherence');
  const energy = overview.metrics.find((metric) => metric.metric_type === 'energy');
  return (
    <div className="data-workspace-layout split-data-layout">
      <section className="workspace-hero-card data-hero-card">
        <div className="workspace-icon"><Apple size={22} strokeWidth={1.8} /></div>
        <span className="workspace-eyebrow">Victus diet intelligence</span>
        <h1>Dietas</h1>
        <p>La vista de dietas debe mostrar decisiones accionables, restricciones y adherencia. El chat sigue siendo el centro, pero aquí el usuario entiende su plan.</p>
      </section>
      <div className="data-two-column">
        <NutritionFocusList items={overview.nutrition_focus} />
        <div className="metric-column-stack">
          {adherence ? <MetricTrendCard metric={adherence} /> : null}
          {energy ? <MetricTrendCard metric={energy} /> : null}
        </div>
      </div>
      <PreferenceTable groups={overview.preference_groups.filter((group) => group.category === 'nutrition' || group.category === 'schedule')} />
    </div>
  );
}
