import type { DashboardSummaryCard } from '../types';

interface SummaryGridProps {
  cards: DashboardSummaryCard[];
}

export function SummaryGrid({ cards }: SummaryGridProps) {
  return (
    <section className="data-summary-grid" aria-label="Resumen de datos personales">
      {cards.map((card) => (
        <article className={`data-summary-card tone-${card.tone}`} key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.detail}</p>
        </article>
      ))}
    </section>
  );
}
