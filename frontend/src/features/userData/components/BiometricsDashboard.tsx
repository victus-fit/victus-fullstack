import { Plus } from 'lucide-react';
import { useState } from 'react';
import { createMetricEntry } from '../api';
import type { HealthOverview } from '../types';
import { MetricTrendCard } from './MetricTrendCard';

interface BiometricsDashboardProps {
  overview: HealthOverview;
  onMetricCreated: () => Promise<void>;
}

export function BiometricsDashboard({ overview, onMetricCreated }: BiometricsDashboardProps) {
  const biometrics = overview.metrics.filter((metric) => ['weight', 'sleep', 'energy', 'adherence'].includes(metric.metric_type));
  const [metricType, setMetricType] = useState('weight');
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const metricLabels: Record<string, [string, string]> = { weight: ['Peso', 'kg'], sleep: ['Sueño', 'h'], energy: ['Energía', '/10'], adherence: ['Adherencia', '%'] };

  async function saveMetric() {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) { setError('Ingresa un valor numérico.'); return; }
    setIsSaving(true); setError(null);
    try {
      const [label, unit] = metricLabels[metricType]!;
      await createMetricEntry({ metric_type: metricType, label, unit, value_number: numericValue });
      setValue('');
      await onMetricCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la biométrica.');
    } finally { setIsSaving(false); }
  }

  return (
    <div className="data-workspace-layout">
      <section className="metric-grid" aria-label="Seguimiento biométrico">
        {biometrics.map((metric) => <MetricTrendCard metric={metric} key={metric.metric_type} />)}
      </section>
      <section className="workspace-card">
        <span className="workspace-eyebrow">Registro manual</span>
        <h2>Actualizar biométrica</h2>
        <div className="meal-editor-fields">
          <label>Señal<select value={metricType} onChange={(event) => setMetricType(event.target.value)}>{Object.entries(metricLabels).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Valor<input type="number" step="0.1" value={value} onChange={(event) => setValue(event.target.value)} placeholder={metricLabels[metricType]![1]} /></label>
        </div>
        {error ? <p className="meal-error">{error}</p> : null}
        <button className="primary-pill" type="button" onClick={() => void saveMetric()} disabled={isSaving || !value.trim()}><Plus size={15} />{isSaving ? 'Guardando…' : 'Guardar registro'}</button>
      </section>
    </div>
  );
}
