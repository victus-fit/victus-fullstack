import { Check, LockKeyhole } from 'lucide-react';
import { useActiveDietPlan } from '../hooks/useActiveDietPlan';
import type { DietPlanDocument, DietPlanMeal } from '../types';

const numberFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function mealItems(meal: DietPlanMeal): string {
  const items = meal.food_items ?? [];
  if (items.length === 0) return meal.name;
  return `${meal.name}: ${items.map((item) => {
    const quantity = item.quantity == null ? '' : `${item.quantity}${item.unit ? ` ${item.unit}` : ''} `;
    return `${quantity}${item.name}`;
  }).join(' · ')}`;
}

function planDays(plan: DietPlanDocument) {
  if (plan.days && plan.days.length > 0) {
    return plan.days.map((day, index) => ({
      day: day.day || `Día ${index + 1}`,
      focus: day.focus || 'Plan personalizado',
      calories: day.calories == null ? null : `${numberFormat.format(Number(day.calories))} kcal`,
      meals: day.meals ?? [],
    }));
  }
  return [{ day: 'Todos los días', focus: 'Estructura diaria', calories: null, meals: plan.meals ?? [] }];
}

export function WeeklyPlanDashboard() {
  const { plan, isLoading, error, refresh } = useActiveDietPlan();

  if (isLoading) return <section className="workspace-card weekly-plan-empty"><p>Cargando tu plan activo…</p></section>;
  if (error) return <section className="workspace-card weekly-plan-empty"><h1>No se pudo cargar tu plan</h1><p>{error}</p><button className="primary-pill" type="button" onClick={() => void refresh()}>Reintentar</button></section>;
  if (!plan) {
    return <section className="workspace-card weekly-plan-empty"><span className="workspace-eyebrow">Plan semanal</span><h1>Aún no tienes un plan activo</h1><p>Pídele a Victus que cree y active tu primera dieta; aparecerá aquí automáticamente.</p></section>;
  }

  const document = plan.plan_json;
  const targets = document.targets;
  const days = planDays(document);
  const hasTargets = Boolean(targets && Object.values(targets).some((value) => Number(value) > 0));

  return (
    <div className="weekly-plan-layout">
      <section className="weekly-plan-hero">
        <div>
          <span className="workspace-eyebrow">Plan activo · revisión {plan.revision_number}</span>
          <h1>Plan semanal</h1>
          <p>{document.description || 'Tu plan personalizado está listo para seguir y ajustar con Victus.'}</p>
        </div>
        <div className="weekly-plan-status"><LockKeyhole size={15} aria-hidden="true" /><span>Activo · solo lectura</span></div>
      </section>

      {hasTargets ? (
        <section className="weekly-plan-targets" aria-label="Objetivos diarios del plan">
          {targets?.calories_kcal ? <div><span>Objetivo diario</span><strong>{numberFormat.format(targets.calories_kcal)} kcal</strong></div> : null}
          {targets?.protein_g ? <div><span>Proteína</span><strong>{numberFormat.format(targets.protein_g)} g</strong></div> : null}
          {targets?.carbohydrate_g ? <div><span>Carbohidratos</span><strong>{numberFormat.format(targets.carbohydrate_g)} g</strong></div> : null}
          {targets?.fat_g ? <div><span>Grasas</span><strong>{numberFormat.format(targets.fat_g)} g</strong></div> : null}
        </section>
      ) : null}

      <section className="weekly-plan-days" aria-label="Comidas del plan">
        {days.map((day, index) => (
          <article className={`weekly-plan-day${index === 0 ? ' is-today' : ''}`} key={`${day.day}-${index}`}>
            <header><div><span>{day.focus}</span><h2>{day.day}</h2></div>{day.calories ? <strong>{day.calories}</strong> : null}</header>
            {day.meals.length > 0 ? <ul>{day.meals.map((meal, mealIndex) => <li key={`${meal.name}-${mealIndex}`}><Check size={14} aria-hidden="true" /><span>{mealItems(meal)}</span></li>)}</ul> : <p>Victus no añadió comidas a esta sección del plan.</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
