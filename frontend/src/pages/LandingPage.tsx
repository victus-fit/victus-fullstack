import { useRef, useState } from 'react';
import type React from 'react';
import { ArrowRight, Compass, LogIn } from 'lucide-react';
import { navigate } from '../lib/navigation';

const planDays = [
  {
    label: 'Lun 13',
    status: 'Completado',
    progress: 82,
    observation: 'Los lunes te funciona mejor un desayuno simple y repetible.',
    meals: [
      ['Huevos, tostada integral y fruta', 'Desayuno · rápido y saciante', '440 kcal', '+28 g proteína'],
      ['Lentejas con arroz y ensalada', 'Almuerzo · económico y completo', '590 kcal', 'Alta fibra'],
      ['Yogur natural con plátano', 'Colación · fácil de transportar', '210 kcal', 'Energía estable'],
      ['Pollo salteado con verduras', 'Cena · ligera y práctica', '530 kcal', '25 min'],
    ],
  },
  {
    label: 'Mar 14',
    status: 'Completado',
    progress: 76,
    observation: 'Los martes cenas más tarde; Victus mueve parte de la energía a la colación.',
    meals: [
      ['Avena nocturna con berries', 'Desayuno · preparado la noche anterior', '410 kcal', 'Repetible'],
      ['Pasta integral con pavo', 'Almuerzo · energía sostenida', '640 kcal', '+35 g proteína'],
      ['Sándwich pequeño de pollo', 'Colación · reforzada', '290 kcal', 'Cena tardía'],
      ['Crema de zapallo y tortilla', 'Cena · tardía y liviana', '470 kcal', 'Fácil digestión'],
    ],
  },
  {
    label: 'Mié 15',
    status: 'Hoy',
    progress: 71,
    observation: 'Hoy tienes entrenamiento. La colación prioriza carbohidratos y proteína.',
    meals: [
      ['Yogur griego, avena y berries', 'Desayuno · alto en proteína y fibra', '420 kcal', 'Compatible'],
      ['Bowl de pollo, quinoa y verduras', 'Almuerzo · fácil de preparar', '610 kcal', '+32 g proteína'],
      ['Manzana con mantequilla de maní', 'Colación · antes del entrenamiento', '230 kcal', 'Energía sostenida'],
      ['Salmón, papas y ensalada verde', 'Cena · omega-3 y vegetales', '560 kcal', 'Cena temprana'],
    ],
  },
  {
    label: 'Jue 16',
    status: 'Planificado',
    progress: 64,
    observation: 'El jueves suele ser ocupado; priorizamos preparaciones de menos de 20 minutos.',
    meals: [
      ['Batido de yogur, avena y cacao', 'Desayuno · listo en 5 minutos', '390 kcal', 'Muy rápido'],
      ['Wrap de pollo y vegetales', 'Almuerzo · portable', '570 kcal', 'Para oficina'],
      ['Fruta y queso fresco', 'Colación · simple', '210 kcal', '2 ingredientes'],
      ['Arroz salteado con huevo', 'Cena · aprovecha sobras', '540 kcal', '18 min'],
    ],
  },
  {
    label: 'Vie 17',
    status: 'Flexible',
    progress: 58,
    observation: 'Los viernes el plan deja margen para una comida social sin perder estructura.',
    meals: [
      ['Tostadas con palta y huevo', 'Desayuno · saciante', '460 kcal', 'Flexible'],
      ['Ensalada tibia de papas y pollo', 'Almuerzo · fácil de ajustar', '600 kcal', 'Flexible'],
      ['Yogur y fruta', 'Colación · ligera', '180 kcal', 'Opcional'],
      ['Comida social flexible', 'Cena · elección guiada', '650 kcal', 'Sin perfeccionismo'],
    ],
  },
  {
    label: 'Sáb 18',
    status: 'Flexible',
    progress: 52,
    observation: 'El sábado priorizamos flexibilidad y una referencia simple de porciones.',
    meals: [
      ['Panqueques de avena y fruta', 'Desayuno · más relajado', '480 kcal', 'Fin de semana'],
      ['Almuerzo libre con guía visual', 'Almuerzo · flexible', '650 kcal', 'Método del plato'],
      ['Frutos secos o fruta', 'Colación · según hambre', '180 kcal', 'Opcional'],
      ['Tacos caseros de pollo', 'Cena · social', '570 kcal', 'Compartible'],
    ],
  },
  {
    label: 'Dom 19',
    status: 'Flexible',
    progress: 47,
    observation: 'El domingo incluye preparación mínima para facilitar el inicio de la semana.',
    meals: [
      ['Yogur, granola y fruta', 'Desayuno · sin cocinar', '430 kcal', 'Simple'],
      ['Pollo al horno con papas', 'Almuerzo · deja porciones', '630 kcal', 'Meal prep'],
      ['Hummus con vegetales', 'Colación · fresca', '190 kcal', 'Alta fibra'],
      ['Sopa de verduras y omelette', 'Cena · reconfortante', '490 kcal', 'Simple'],
    ],
  },
];

const mealIcons = ['☀', '◐', '◇', '☾'];

export function LandingPage() {
  const logoRef = useRef<HTMLImageElement | null>(null);
  const [activeDay, setActiveDay] = useState(2);
  const [activeMeal, setActiveMeal] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const day = planDays[activeDay];
  const meal = day.meals[activeMeal];

  function nudgeCompass() {
    const logo = logoRef.current;
    if (!logo) return;
    logo.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(0deg)' }], {
      duration: 650,
      easing: 'cubic-bezier(.2,.8,.2,1)',
    });
  }

  function selectDay(index: number) {
    setActiveDay(index);
    setActiveMeal(0);
  }

  return (
    <main className="victus-landing" id="main-content">
      <header className="vl-nav">
        <div className="vl-container vl-nav-inner">
          <button className="vl-brand" type="button" onClick={() => navigate('/')} onPointerEnter={nudgeCompass}>
            <span className="vl-brand-icon">
              <img ref={logoRef} src="/victus-logo.svg" alt="" aria-hidden="true" />
            </span>
            <span>victus</span>
          </button>
          <nav className="vl-nav-center" aria-label="Secciones">
            <a href="#product">Producto</a>
            <a href="#how">Cómo funciona</a>
            <a href="#evidence">Evidencia</a>
          </nav>
          <div className="vl-nav-actions">
            <a
              className="vl-repo"
              href="https://github.com/search?q=victus-agent&type=repositories"
              target="_blank"
              rel="noreferrer"
            >
              <Compass size={17} />
              <strong>victus-agent</strong>
            </a>
            <button className="vl-btn vl-btn-ghost" type="button" onClick={() => navigate('/login')}>
              <LogIn size={16} /> Ingresar
            </button>
            <button className="vl-btn vl-btn-primary" type="button" onClick={() => navigate('/login')}>
              Comenzar
            </button>
          </div>
        </div>
      </header>

      <section className="vl-hero vl-container">
        <h1>Tu alimentación, convertida en un plan que sí puedes seguir.</h1>
        <p>
          Victus es un agente personal de recomendación de dietas y bienestar. Aprende de tus objetivos,
          preferencias, hábitos, restricciones y biométricas para adaptar tus comidas sin imponer dietas perfectas.
        </p>
        <div className="vl-hero-actions">
          <button className="vl-btn vl-btn-primary" type="button" onClick={() => navigate('/login')}>
            Crear mi plan <ArrowRight size={17} />
          </button>
          <a className="vl-btn" href="#how">
            Ver cómo funciona
          </a>
        </div>
      </section>

      <section className="vl-product-wrap" id="product">
        <div className="vl-container vl-browser-shell">
          <div className="vl-browser-glow" />
          <div className="vl-browser">
            <div className="vl-browserbar">
              <span className="vl-dot" />
              <span className="vl-dot" />
              <span className="vl-dot" />
              <span className="vl-browser-title">Victus · Plan semanal personalizado</span>
              <span className="vl-preview-live">
                <i /> Preview interactiva
              </span>
            </div>
            <div className="vl-app-preview">
              <aside className="vl-app-side">
                <div className="vl-preview-brand">
                  <img src="/victus-logo.svg" alt="" aria-hidden="true" />
                  <span>victus</span>
                </div>
                <div className="vl-workspace-label">TU ESPACIO</div>
                {['Hoy', 'Conversaciones', 'Plan semanal', 'Biométricas', 'Perfil'].map((item, index) => (
                  <button className={`vl-navitem ${index === 0 ? 'active' : ''}`} key={item} type="button">
                    <span className="vl-nav-icon" />
                    {item}
                  </button>
                ))}
                <div className="vl-side-bottom">
                  <button className="vl-navitem" type="button">
                    <span className="vl-nav-icon" />
                    Configuración
                  </button>
                </div>
              </aside>

              <section className="vl-app-main" aria-label="Preview del plan Victus">
                <div className="vl-app-head">
                  <div>
                    <div className="vl-app-title">Buenos días, Carlos</div>
                    <div className="vl-app-sub">Tu plan de hoy está ajustado a tu meta y a tu actividad.</div>
                  </div>
                  <button className="vl-btn vl-btn-primary vl-ask-btn" type="button" onClick={() => setChatOpen(true)}>
                    Hablar con Victus
                  </button>
                </div>

                <div className="vl-week" aria-label="Semana">
                  {planDays.map((item, index) => (
                    <button
                      className={`vl-day ${index === activeDay ? 'active' : ''}`}
                      key={item.label}
                      type="button"
                      onClick={() => selectDay(index)}
                    >
                      <small>{item.label}</small>
                      <strong>{item.status}</strong>
                    </button>
                  ))}
                </div>

                <div className="vl-meal-list">
                  {day.meals.map((item, index) => (
                    <button
                      className={`vl-meal-row ${index === activeMeal ? 'selected' : ''}`}
                      key={item[0]}
                      type="button"
                      onClick={() => setActiveMeal(index)}
                    >
                      <span className="vl-meal-info">
                        <span className="vl-meal-icon">{mealIcons[index]}</span>
                        <span>
                          <span className="vl-meal-name">{item[0]}</span>
                          <span className="vl-meal-detail">{item[1]}</span>
                        </span>
                      </span>
                      <span className="vl-meal-meta">
                        <span className="vl-kcal">{item[2]}</span>
                        <span className="vl-tag">{item[3]}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className={`vl-chat-drawer ${chatOpen ? 'open' : ''}`}>
                  <div className="vl-chat-head">
                    <span>Victus</span>
                    <button type="button" onClick={() => setChatOpen(false)} aria-label="Cerrar chat">
                      x
                    </button>
                  </div>
                  <div className="vl-chat-body">
                    <div className="vl-assistant-msg">
                      Tu plan está bien equilibrado. Como hoy entrenas, mantendría la colación de las 17:30 y adelantaría
                      la cena si terminas antes de las 20:00.
                    </div>
                    <div className="vl-quick-actions">
                      <button type="button">Cambiar almuerzo</button>
                      <button type="button">Tengo poco tiempo</button>
                      <button type="button">Hoy entreno</button>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="vl-context">
                <h3>Tu contexto</h3>
                <div className="vl-context-section">
                  <div className="vl-context-label">Objetivo principal</div>
                  <div className="vl-context-value">Mejorar composición corporal sin dietas extremas.</div>
                </div>
                <div className="vl-context-section">
                  <div className="vl-context-label">Progreso semanal</div>
                  <div className="vl-context-value">{Math.max(3, Math.round(day.progress / 14))} de 7 días dentro del plan</div>
                  <div className="vl-progress">
                    <span style={{ width: `${day.progress}%` }} />
                  </div>
                </div>
                <div className="vl-context-section">
                  <div className="vl-context-label">Comida seleccionada</div>
                  <div className="vl-selected-card">
                    <strong>{meal[0]}</strong>
                    <p>{meal[1]} pensado para sostener energía y adherencia.</p>
                  </div>
                </div>
                <div className="vl-context-section">
                  <div className="vl-context-label">Victus observó</div>
                  <div className="vl-context-value">{day.observation}</div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="vl-trust">
        <div className="vl-container">
          <p>Diseñado para acompañar decisiones reales, no para imponer dietas perfectas.</p>
          <div className="vl-trust-items">
            <span>Personalización</span>
            <span>Evidencia</span>
            <span>Seguridad</span>
            <span>Adherencia</span>
            <span>Privacidad</span>
          </div>
        </div>
      </section>

      <section className="vl-section" id="how">
        <div className="vl-container">
          <div className="vl-section-head">
            <div className="vl-section-kicker">Un agente que entiende tu vida</div>
            <h2>Recomendaciones útiles, sostenibles y explicables.</h2>
            <p>
              Victus combina tu información personal con conocimiento nutricional para proponer cambios pequeños que
              puedan mantenerse en el tiempo.
            </p>
          </div>
          <div className="vl-feature-grid">
            {[
              ['01', 'Personaliza', 'Adapta comidas, porciones y horarios a tus metas, preferencias y restricciones.'],
              ['02', 'Aprende', 'Reconoce patrones de adherencia y ajusta el plan según lo que realmente funciona.'],
              ['03', 'Explica', 'Muestra por qué recomienda cada cambio y qué información utilizó.'],
              ['04', 'Protege', 'Evita recomendaciones incompatibles con señales relevantes de salud.'],
            ].map(([num, title, copy]) => (
              <article className="vl-feature" key={num}>
                <div className="vl-feature-num">{num}</div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="vl-split" id="evidence">
        <div className="vl-container vl-split-grid">
          <div>
            <div className="vl-section-kicker">Acompañamiento diario</div>
            <h2>No solo entrega un menú. Te ayuda a sostenerlo.</h2>
            <p>
              Victus observa tu progreso, identifica fricciones y propone ajustes concretos sin hacerte sentir que
              fallaste.
            </p>
          </div>
          <div className="vl-insight-panel">
            {[
              ['Mayor adherencia con desayunos repetibles', 'Los desayunos con 3 ingredientes se completan con mayor frecuencia.'],
              ['Hambre elevada los días de entrenamiento', 'Se añadió una colación pre-entreno con proteína y carbohidratos.'],
              ['Plan ajustado, no reiniciado', 'Los cambios se incorporan sin borrar tu progreso anterior.'],
            ].map(([title, copy]) => (
              <div className="vl-insight-row" key={title}>
                <span className="vl-status-dot" />
                <div>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
