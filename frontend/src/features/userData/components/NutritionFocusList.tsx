import { CheckCircle2, ShieldCheck, TimerReset } from 'lucide-react';
import type { NutritionFocusItem } from '../types';

interface NutritionFocusListProps {
  items: NutritionFocusItem[];
}

function iconFor(status: string) {
  if (status === 'guardrail') return <ShieldCheck size={17} />;
  if (status === 'planned') return <TimerReset size={17} />;
  return <CheckCircle2 size={17} />;
}

export function NutritionFocusList({ items }: NutritionFocusListProps) {
  return (
    <section className="nutrition-focus-card">
      <div className="section-heading compact">
        <span>Diet intelligence</span>
        <h2>Prioridades actuales</h2>
        <p>Cómo se vería una síntesis simple para que el usuario entienda qué está usando Victus como contexto.</p>
      </div>
      <div className="nutrition-focus-list">
        {items.map((item) => (
          <article className={`nutrition-focus-item status-${item.status}`} key={item.title}>
            <div className="nutrition-focus-icon">{iconFor(item.status)}</div>
            <div>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
