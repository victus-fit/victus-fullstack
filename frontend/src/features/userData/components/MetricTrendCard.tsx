import type { MetricSeries } from '../types';

interface MetricTrendCardProps {
  metric: MetricSeries;
}

export function MetricTrendCard({ metric }: MetricTrendCardProps) {
  const latest = metric.points.at(-1);
  return (
    <article className="metric-trend-card">
      <div className="metric-trend-header">
        <div>
          <span>{metric.label}</span>
          <strong>
            {latest ? latest.value.toLocaleString('es-CL') : '—'}{metric.unit ?? ''}
          </strong>
        </div>
      </div>
    </article>
  );
}
