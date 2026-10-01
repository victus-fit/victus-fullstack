import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { CompassMark } from '../components/CompassMark';
import { apiFetch } from '../lib/api';
import { navigate } from '../lib/navigation';

export function OnboardingPage() {
  const auth = useAuth();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!auth.user) return;
    void apiFetch<{ completed: boolean }>('/api/users/me/onboarding').then(({ completed }) => { if (completed) navigate('/app'); }).finally(() => setIsChecking(false));
  }, [auth.user]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true); setError(null);
    try {
      await apiFetch('/api/users/me/onboarding', { method: 'POST', body: JSON.stringify({ weight_kg: Number(weight), height_cm: Number(height), age: Number(age), activity_level: activity, goal }) });
      navigate('/app');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos guardar tu información.');
    } finally { setIsSaving(false); }
  }

  if (!auth.user) { navigate('/login'); return null; }
  if (isChecking) return <main className="loading-screen" id="main-content" />;
  return <main className="auth-shell onboarding-shell" id="main-content"><section className="auth-card onboarding-card" aria-labelledby="onboarding-title">
    <div className="auth-brand"><CompassMark /><span>Victus</span></div>
    <div className="auth-copy"><span className="auth-context">Primer paso</span><h1 id="onboarding-title">Conozcamos tu punto de partida</h1><p>Usaremos estos datos para adaptar tus objetivos y recomendaciones. Puedes actualizarlos después.</p></div>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <form className="auth-form onboarding-form" onSubmit={submit}>
      <div className="onboarding-fields"><label>Peso actual (kg)<input value={weight} onChange={(event) => setWeight(event.target.value)} type="number" min="30" max="350" step="0.1" required autoFocus /></label><label>Estatura (cm)<input value={height} onChange={(event) => setHeight(event.target.value)} type="number" min="100" max="250" step="1" required /></label><label>Edad<input value={age} onChange={(event) => setAge(event.target.value)} type="number" min="13" max="120" step="1" required /></label></div>
      <fieldset className="onboarding-choice-group"><legend>Nivel de actividad</legend><div className="onboarding-choice-grid">{[['low', 'Bajo', 'Movimiento ocasional'], ['moderate', 'Moderado', 'Actividad regular'], ['high', 'Alto', 'Entreno frecuente']].map(([value, label, detail]) => <button className={`onboarding-choice${activity === value ? ' is-selected' : ''}`} type="button" key={value} onClick={() => setActivity(value)}><strong>{label}</strong><span>{detail}</span></button>)}</div></fieldset>
      <fieldset className="onboarding-choice-group"><legend>Objetivo principal</legend><div className="onboarding-choice-grid">{[['lose_fat', 'Perder grasa', 'Conservando energía'], ['maintain', 'Mantenerme', 'Sostener hábitos'], ['gain_muscle', 'Ganar masa muscular', 'Apoyar entrenamiento']].map(([value, label, detail]) => <button className={`onboarding-choice${goal === value ? ' is-selected' : ''}`} type="button" key={value} onClick={() => setGoal(value)}><strong>{label}</strong><span>{detail}</span></button>)}</div></fieldset>
      <button className="auth-submit" disabled={isSaving} type="submit"><span>{isSaving ? 'Guardando…' : 'Continuar'}</span>{!isSaving ? <ArrowRight size={16} /> : null}</button>
    </form>
  </section></main>;
}
