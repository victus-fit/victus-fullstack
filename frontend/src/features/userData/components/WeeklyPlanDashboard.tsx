import { Check, LockKeyhole } from 'lucide-react';

const weeklyPlan = [
  { day: 'Lunes', focus: 'Fuerza · tren superior', calories: '2.400 kcal', meals: ['Avena nocturna · frutos rojos · yogur', 'Pollo al limón · arroz integral · ensalada', 'Salmón · papa asada · brócoli', 'Yogur griego · nueces'] },
  { day: 'Martes', focus: 'Cardio suave', calories: '2.250 kcal', meals: ['Huevos revueltos · tostada integral · palta', 'Pavo · quinoa · verduras asadas', 'Lentejas guisadas · ensalada verde', 'Manzana · mantequilla de maní'] },
  { day: 'Miércoles', focus: 'Fuerza · tren inferior', calories: '2.400 kcal', meals: ['Avena nocturna · frutos rojos · yogur', 'Carne magra · camote · ensalada', 'Pasta integral · atún · tomate', 'Batido de proteína · plátano'] },
  { day: 'Jueves', focus: 'Recuperación activa', calories: '2.250 kcal', meals: ['Omelette de verduras · pan de masa madre', 'Salmón · couscous · espárragos', 'Pollo al horno · verduras', 'Kéfir · almendras'] },
  { day: 'Viernes', focus: 'Fuerza · cuerpo completo', calories: '2.400 kcal', meals: ['Yogur griego · granola · fruta', 'Bowl de pollo · arroz · palta', 'Merluza · puré de coliflor · ensalada', 'Tostada integral · ricota'] },
  { day: 'Sábado', focus: 'Movimiento libre', calories: '2.300 kcal', meals: ['Panqueques de avena · fruta', 'Ensalada tibia de garbanzos · huevo', 'Tacos de pescado · repollo · palta', 'Chocolate 70% · frutillas'] },
  { day: 'Domingo', focus: 'Descanso', calories: '2.200 kcal', meals: ['Huevos · fruta · tostada integral', 'Pollo asado · papas · ensalada', 'Crema de verduras · pan integral', 'Yogur natural · semillas'] },
];

interface WeeklyPlanDashboardProps {
  hasAssignedPlan: boolean;
}

export function WeeklyPlanDashboard({ hasAssignedPlan }: WeeklyPlanDashboardProps) {
  if (!hasAssignedPlan) {
    return (
      <section className="workspace-card weekly-plan-empty">
        <span className="workspace-eyebrow">Plan semanal</span>
        <h1>Aún no tienes un plan asignado</h1>
        <p>Tu plan aparecerá aquí cuando esté creado para tu perfil.</p>
      </section>
    );
  }

  return (
    <div className="weekly-plan-layout">
      <section className="weekly-plan-hero">
        <div>
          <span className="workspace-eyebrow">Plan seleccionado · David</span>
          <h1>Plan semanal</h1>
          <p>Una semana equilibrada para sostener composición corporal, energía y recuperación.</p>
        </div>
        <div className="weekly-plan-status"><LockKeyhole size={15} aria-hidden="true" /><span>Beta · solo lectura</span></div>
      </section>

      <section className="weekly-plan-targets" aria-label="Objetivos diarios del plan">
        <div><span>Promedio diario</span><strong>2.300 kcal</strong></div>
        <div><span>Proteína</span><strong>170 g</strong></div>
        <div><span>Carbohidratos</span><strong>250 g</strong></div>
        <div><span>Grasas</span><strong>75 g</strong></div>
      </section>

      <section className="weekly-plan-days" aria-label="Comidas del plan semanal">
        {weeklyPlan.map((plan, index) => (
          <article className={`weekly-plan-day${index === 0 ? ' is-today' : ''}`} key={plan.day}>
            <header>
              <div><span>{index === 0 ? 'Hoy' : plan.focus}</span><h2>{plan.day}</h2></div>
              <strong>{plan.calories}</strong>
            </header>
            <ul>
              {plan.meals.map((meal) => <li key={meal}><Check size={14} aria-hidden="true" /><span>{meal}</span></li>)}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
