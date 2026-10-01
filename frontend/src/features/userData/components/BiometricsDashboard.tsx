import { Plus } from 'lucide-react';
import { useState } from 'react';
import { createMetricEntry } from '../api';
import type { HealthOverview } from '../types';
import { MetricTrendCard } from './MetricTrendCard';
import { useLanguage } from '../../../i18n/LanguageContext';

interface BiometricsDashboardProps {
  overview: HealthOverview;
  onMetricCreated: () => Promise<void>;
}

export function BiometricsDashboard({ overview, onMetricCreated }: BiometricsDashboardProps) {
  const { language } = useLanguage();
  const biometrics = overview.metrics.filter((metric) => ['weight', 'height', 'sleep', 'energy', 'adherence'].includes(metric.metric_type));
  const foodPreferences = overview.preference_groups.find((group) => group.category === 'nutrition')?.items ?? [];
  const initialProfile = overview.preference_groups.filter((group) => ['goal', 'schedule'].includes(group.category)).flatMap((group) => group.items);
  const [metricType, setMetricType] = useState('weight');
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const metricLabels: Record<string, [string, string]> = { weight: ['Peso', 'kg'], height: ['Estatura', 'cm'], sleep: ['Sueño', 'h'], energy: ['Energía', '/10'], adherence: ['Adherencia', '%'] };
  const profileCopy = language === 'es'
    ? {
        age: 'Edad', goal: 'Objetivo', activity: 'Actividad',
        goals: { gain_muscle: 'Ganar masa muscular', lose_weight: 'Bajar de peso', maintain_weight: 'Mantener mi peso', improve_health: 'Mejorar mi salud' },
        activities: { low: 'Baja', moderate: 'Moderada', medium: 'Moderada', high: 'Alta' },
      }
    : {
        age: 'Age', goal: 'Goal', activity: 'Activity',
        goals: { gain_muscle: 'Build muscle', lose_weight: 'Lose weight', maintain_weight: 'Maintain my weight', improve_health: 'Improve my health' },
        activities: { low: 'Low', moderate: 'Moderate', medium: 'Moderate', high: 'High' },
      };

  function formatInitialProfile(item: typeof initialProfile[number]) {
    const label = item.label.trim().toLowerCase();
    const value = item.value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (item.category === 'goal' || ['goal', 'objetivo'].includes(label)) return { label: profileCopy.goal, value: profileCopy.goals[value as keyof typeof profileCopy.goals] ?? item.value };
    if (['activity', 'actividad'].includes(label)) return { label: profileCopy.activity, value: profileCopy.activities[value as keyof typeof profileCopy.activities] ?? item.value };
    if (['age', 'edad'].includes(label)) return { label: profileCopy.age, value: item.value };
    return { label: item.label, value: item.value };
  }

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
      {foodPreferences.length > 0 ? <section className="workspace-card biometrics-preferences" aria-labelledby="food-preferences-title">
        <span className="workspace-eyebrow">Contexto alimentario</span>
        <h2 id="food-preferences-title">Preferencias alimenticias</h2>
        <ul>
          {foodPreferences.map((preference) => <li key={preference.preference_id}><strong>{preference.label}</strong><span>{preference.value}</span></li>)}
        </ul>
      </section> : null}
      {initialProfile.length > 0 ? <section className="workspace-card biometrics-preferences" aria-labelledby="initial-profile-title">
        <span className="workspace-eyebrow">Punto de partida</span>
        <h2 id="initial-profile-title">Datos iniciales</h2>
        <ul>{initialProfile.map((item) => {
          const profileItem = formatInitialProfile(item);
          return <li key={item.preference_id}><strong>{profileItem.label}</strong><span>{profileItem.value}</span></li>;
        })}</ul>
      </section> : null}
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
