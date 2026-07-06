import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { MetricSeries } from '../types';
import { MiniLineChart } from './MiniLineChart';

interface MetricTrendCardProps {
  metric: MetricSeries;
}

function TrendIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  if (normalized.includes('subiendo')) return <ArrowUpRight size={16} />;
  if (normalized.includes('bajando')) return <ArrowDownRight size={16} />;
  return <ArrowRight size={16} />;
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
        <div className="metric-trend-badge">
          <TrendIcon label={metric.trend_label} />
          <span>{metric.change_label}</span>
        </div>
      </div>
      <MiniLineChart points={metric.points} label={`Tendencia de ${metric.label}`} />
      <div className="metric-axis-row">
        <span>{metric.points[0]?.x}</span>
        <span>{metric.trend_label}</span>
        <span>{metric.points.at(-1)?.x}</span>
      </div>
    </article>
  );
}
