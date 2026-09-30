import { useRef, useState } from 'react';
import type React from 'react';
import { ArrowRight, Compass, LogIn } from 'lucide-react';
import { navigate } from '../lib/navigation';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../auth/AuthContext';
import { useBackendVictusChat } from '../features/chat/hooks/useBackendVictusChat';
import { LandingAppPreview } from '../features/chat/components/LandingAppPreview';
import { useDemoVictusChat } from '../features/chat/hooks/useDemoVictusChat';
import { useLanguage } from '../i18n/LanguageContext';

const planDays = [
  {
    label: 'Mon 13',
    status: 'Complete',
    progress: 82,
    observation: 'A simple, repeatable breakfast works best for you on Mondays.',
    meals: [
      ['Eggs, whole-grain toast and fruit', 'Breakfast · quick and filling', '440 kcal', '+28 g protein'],
      ['Lentils with rice and salad', 'Lunch · affordable and complete', '590 kcal', 'High fibre'],
      ['Plain yogurt with banana', 'Snack · easy to take along', '210 kcal', 'Steady energy'],
      ['Chicken stir-fry with vegetables', 'Dinner · light and practical', '530 kcal', '25 min'],
    ],
  },
  {
    label: 'Tue 14', status: 'Complete',
    progress: 76,
    observation: 'You eat dinner later on Tuesdays, so Victus shifts some energy into your snack.',
    meals: [
      ['Avena nocturna con berries', 'Desayuno · preparado la noche anterior', '410 kcal', 'Repetible'],
      ['Pasta integral con pavo', 'Almuerzo · energía sostenida', '640 kcal', '+35 g proteína'],
      ['Sándwich pequeño de pollo', 'Colación · reforzada', '290 kcal', 'Cena tardía'],
      ['Crema de zapallo y tortilla', 'Cena · tardía y liviana', '470 kcal', 'Fácil digestión'],
    ],
  },
  {
    label: 'Wed 15', status: 'Today',
    progress: 71,
    observation: 'You train today. Your snack prioritizes carbohydrates and protein.',
    meals: [
      ['Yogur griego, avena y berries', 'Desayuno · alto en proteína y fibra', '420 kcal', 'Compatible'],
      ['Bowl de pollo, quinoa y verduras', 'Almuerzo · fácil de preparar', '610 kcal', '+32 g proteína'],
      ['Manzana con mantequilla de maní', 'Colación · antes del entrenamiento', '230 kcal', 'Energía sostenida'],
      ['Salmón, papas y ensalada verde', 'Cena · omega-3 y vegetales', '560 kcal', 'Cena temprana'],
    ],
  },
  {
    label: 'Thu 16', status: 'Planned',
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
    label: 'Fri 17',
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
    label: 'Sat 18',
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
    label: 'Sun 19',
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
  const auth = useAuth();
  const chat = useBackendVictusChat();
  const demoChat = useDemoVictusChat();
  const { language } = useLanguage();
  const copy = language === 'es' ? {
    product: 'Producto', how: 'Cómo funciona', evidence: 'Evidencia', signIn: 'Ingresar', getStarted: 'Comenzar',
    hero: 'Tu alimentación, convertida en un plan que sí puedes seguir.', description: 'Victus es un agente personal de nutrición y bienestar que adapta tus comidas a tu vida.', create: 'Crear mi plan', learn: 'Ver cómo funciona',
    trust: 'Diseñado para apoyar decisiones reales, no para imponer dietas perfectas.',
    trustItems: ['Personalización', 'Evidencia', 'Seguridad', 'Constancia', 'Privacidad'],
    howKicker: 'Un agente que entiende tu vida',
    howTitle: 'Recomendaciones útiles, sostenibles y explicables.',
    howDescription: 'Victus combina tu información personal con conocimiento nutricional para sugerir pequeños cambios que puedes mantener en el tiempo.',
    features: [
      ['01', 'Personaliza', 'Adapta comidas, porciones y horarios a tus objetivos, preferencias y restricciones.'],
      ['02', 'Aprende', 'Reconoce patrones de constancia y ajusta el plan según lo que realmente te funciona.'],
      ['03', 'Explica', 'Muestra por qué se recomienda cada cambio y qué información lo fundamenta.'],
      ['04', 'Protege', 'Evita recomendaciones que entren en conflicto con señales relevantes de salud.'],
    ],
    supportKicker: 'Acompañamiento diario',
    supportTitle: 'Más que un menú. Ayuda para sostenerlo.',
    supportDescription: 'Victus observa tu progreso, identifica obstáculos y sugiere ajustes concretos sin hacerte sentir que fallaste.',
    insights: [
      ['Mayor constancia con desayunos repetibles', 'Los desayunos de tres ingredientes se completan con más frecuencia.'],
      ['Más hambre en días de entrenamiento', 'Se agregó una colación antes de entrenar con proteína y carbohidratos.'],
      ['Plan ajustado, no reiniciado', 'Los cambios se incorporan sin eliminar tu progreso anterior.'],
    ],
  } : {
    product: 'Product', how: 'How it works', evidence: 'Evidence', signIn: 'Sign in', getStarted: 'Get started',
    hero: 'Your nutrition, turned into a plan you can actually follow.', description: 'Victus is a personal nutrition and wellbeing agent that adapts meals to your life.', create: 'Create my plan', learn: 'See how it works',
    trust: 'Designed to support real decisions, not impose perfect diets.',
    trustItems: ['Personalisation', 'Evidence', 'Safety', 'Consistency', 'Privacy'],
    howKicker: 'An agent that understands your life',
    howTitle: 'Useful, sustainable and explainable recommendations.',
    howDescription: 'Victus combines your personal information with nutrition knowledge to suggest small changes that you can sustain over time.',
    features: [
      ['01', 'Personalise', 'Adapt meals, portions and schedules to your goals, preferences and restrictions.'],
      ['02', 'Learn', 'Recognise consistency patterns and adjust the plan based on what actually works.'],
      ['03', 'Explain', 'Show why each change is recommended and what information informed it.'],
      ['04', 'Protect', 'Avoid recommendations that conflict with relevant health signals.'],
    ],
    supportKicker: 'Daily support',
    supportTitle: 'More than a menu. Help to sustain it.',
    supportDescription: 'Victus observes your progress, identifies friction and suggests concrete adjustments without making you feel like you failed.',
    insights: [
      ['More consistency with repeatable breakfasts', 'Breakfasts with three ingredients are completed more often.'],
      ['Higher hunger on training days', 'A pre-workout snack with protein and carbohydrates was added.'],
      ['Plan adjusted, not restarted', 'Changes are incorporated without deleting your previous progress.'],
    ],
  };
  const logoRef = useRef<HTMLImageElement | null>(null);
  const [activeDay, setActiveDay] = useState(2);
  const [activeMeal, setActiveMeal] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
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

  function continueWithPreviewMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = previewMessage.trim();
    if (!message) return;
    if (auth.user) {
      chat.sendMessage(message);
      setPreviewMessage('');
      return;
    }
    window.localStorage.setItem('victus-pending-message', message);
    navigate(`/login?return_to=${encodeURIComponent(`${window.location.origin}/app`)}`);
  }

  function sendSuggestedMessage(message: string) {
    setChatOpen(true);
    if (auth.user) {
      chat.sendMessage(message);
      return;
    }
    setPreviewMessage(message);
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
          <nav className="vl-nav-center" aria-label="Sections">
            <a href="#product">{copy.product}</a>
            <a href="#how">{copy.how}</a>
            <a href="#evidence">{copy.evidence}</a>
          </nav>
          <div className="vl-nav-actions">
            <LanguageSwitcher />
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
              <LogIn size={16} /> {copy.signIn}
            </button>
            <button className="vl-btn vl-btn-primary" type="button" onClick={() => navigate('/login')}>
              {copy.getStarted}
            </button>
          </div>
        </div>
      </header>

      <section className="vl-hero vl-container">
        <h1>{copy.hero}</h1>
        <p>
          {copy.description}
        </p>
        <div className="vl-hero-actions">
          <button className="vl-btn vl-btn-primary" type="button" onClick={() => navigate('/login')}>
            {copy.create} <ArrowRight size={17} />
          </button>
          <a className="vl-btn" href="https://wiki.victus.fit/" target="_blank" rel="noreferrer">
            {copy.learn}
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
              <span className="vl-browser-title">Victus · Personalised weekly plan</span>
              <span className="vl-preview-live">
                <i /> Interactive preview
              </span>
            </div>
            <div className="vl-app-preview">
              <LandingAppPreview user={auth.user} chat={auth.user ? chat : demoChat} />
              <aside className="vl-app-side">
                <div className="vl-preview-brand">
                  <img src="/victus-logo.svg" alt="" aria-hidden="true" />
                  <span>victus</span>
                </div>
                <div className="vl-workspace-label">YOUR SPACE</div>
                {['Today', 'Conversations', 'Weekly plan', 'Biometrics', 'Profile'].map((item, index) => (
                  <button className={`vl-navitem ${index === 0 ? 'active' : ''}`} key={item} type="button">
                    <span className="vl-nav-icon" />
                    {item}
                  </button>
                ))}
                <div className="vl-side-bottom">
                  <button className="vl-navitem" type="button">
                    <span className="vl-nav-icon" />
                    Settings
                  </button>
                </div>
              </aside>

              <section className="vl-app-main" aria-label="Victus plan preview">
                <div className="vl-app-head">
                  <div>
                    <div className="vl-app-title">Good morning, David</div>
                    <div className="vl-app-sub">Your plan today is tailored to your goal and activity.</div>
                  </div>
                  <button className="vl-btn vl-btn-primary vl-ask-btn" type="button" onClick={() => setChatOpen(true)}>
                    Talk to Victus
                  </button>
                </div>

                <div className="vl-week" aria-label="Week">
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
                    <button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat">
                      x
                    </button>
                  </div>
                  <div className="vl-chat-body">
                    {auth.user ? (
                      <div className="vl-live-messages" aria-live="polite">
                        {chat.messages.slice(-4).map((message) => <div className={`vl-assistant-msg ${message.role}`} key={message.id}>{message.text || 'Victus is thinking…'}</div>)}
                      </div>
                    ) : <div className="vl-assistant-msg">Your plan is well balanced. Since you train today, keep your 5:30pm snack and move dinner earlier if you finish before 8pm.</div>}
                    <div className="vl-quick-actions">
                      <button type="button" onClick={() => sendSuggestedMessage('Can you change my lunch without disrupting my plan?')}>Change lunch</button>
                      <button type="button" onClick={() => sendSuggestedMessage('I am short on time today. What should I adjust?')}>I am short on time</button>
                      <button type="button" onClick={() => sendSuggestedMessage('I train today. What should I adjust?')}>I train today</button>
                    </div>
                    <form className="vl-preview-composer" onSubmit={continueWithPreviewMessage}>
                      <input value={previewMessage} onChange={(event) => setPreviewMessage(event.target.value)} disabled={auth.isLoading || chat.status !== 'ready'} placeholder="Ask about your plan…" />
                      <button type="submit" disabled={!previewMessage.trim() || auth.isLoading || Boolean(auth.user && chat.status !== 'ready')}>{auth.user ? 'Send' : 'Continue'}</button>
                    </form>
                  </div>
                </div>
              </section>

              <aside className="vl-context">
                <h3>David's context</h3>
                <div className="vl-context-section">
                  <div className="vl-context-label">Primary goal</div>
                  <div className="vl-context-value">Improve body composition without extreme diets.</div>
                </div>
                <div className="vl-context-section">
                  <div className="vl-context-label">Weekly progress</div>
                  <div className="vl-context-value">{Math.max(3, Math.round(day.progress / 14))} of 7 days on plan</div>
                  <div className="vl-progress">
                    <span style={{ width: `${day.progress}%` }} />
                  </div>
                </div>
                <div className="vl-context-section">
                  <div className="vl-context-label">Selected meal</div>
                  <div className="vl-selected-card">
                    <strong>{meal[0]}</strong>
                    <p>{meal[1]} designed to support energy and consistency.</p>
                  </div>
                </div>
                <div className="vl-context-section">
                  <div className="vl-context-label">Victus noticed</div>
                  <div className="vl-context-value">{day.observation}</div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="vl-trust">
        <div className="vl-container">
          <p>{copy.trust}</p>
          <div className="vl-trust-items">
            {copy.trustItems.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </section>

      <section className="vl-section" id="how">
        <div className="vl-container">
          <div className="vl-section-head">
            <div className="vl-section-kicker">{copy.howKicker}</div>
            <h2>{copy.howTitle}</h2>
            <p>{copy.howDescription}</p>
          </div>
          <div className="vl-feature-grid">
            {copy.features.map(([num, title, description]) => (
              <article className="vl-feature" key={num}>
                <div className="vl-feature-num">{num}</div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="vl-split" id="evidence">
        <div className="vl-container vl-split-grid">
          <div>
            <div className="vl-section-kicker">{copy.supportKicker}</div>
            <h2>{copy.supportTitle}</h2>
            <p>{copy.supportDescription}</p>
          </div>
          <div className="vl-insight-panel">
            {copy.insights.map(([title, description]) => (
              <div className="vl-insight-row" key={title}>
                <span className="vl-status-dot" />
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
