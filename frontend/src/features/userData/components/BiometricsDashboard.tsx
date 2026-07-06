import { Activity } from 'lucide-react';
import type { HealthOverview } from '../types';
import { MetricTrendCard } from './MetricTrendCard';
import { SummaryGrid } from './SummaryGrid';

interface BiometricsDashboardProps {
  overview: HealthOverview;
}

export function BiometricsDashboard({ overview }: BiometricsDashboardProps) {
  const biometrics = overview.metrics.filter((metric) => ['weight', 'sleep', 'energy', 'adherence'].includes(metric.metric_type));
  return (
    <div className="data-workspace-layout">
      <section className="workspace-hero-card data-hero-card">
        <div className="workspace-icon"><Activity size={22} strokeWidth={1.8} /></div>
        <span className="workspace-eyebrow">Victus biometrics</span>
        <h1>Biometrics</h1>
        <p>Peso, sueño, energía y adherencia se muestran como señales simples. Esta capa después puede recibir datos desde formularios, wearables o LangGraph.</p>
      </section>
      <SummaryGrid cards={overview.summary_cards} />
      <section className="metric-grid">
        {biometrics.map((metric) => <MetricTrendCard metric={metric} key={metric.metric_type} />)}
      </section>
    </div>
  );
}
