import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { ArrowRight, ClipboardPlus, Compass, FileSearch, FileText, LogIn, Salad, UserPen } from 'lucide-react';
import { navigate } from '../lib/navigation';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../auth/AuthContext';
import { useBackendVictusChat } from '../features/chat/hooks/useBackendVictusChat';
import { LandingAppPreview } from '../features/chat/components/LandingAppPreview';
import { useDemoVictusChat } from '../features/chat/hooks/useDemoVictusChat';
import { useLanguage } from '../i18n/LanguageContext';
import { apiFetch } from '../lib/api';

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

type EvidenceStats = {
  collection: string;
  evidence_count: number;
  paper_count: number;
};

function GitHubMark({ size = 17 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="currentColor" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M12 .297a12 12 0 0 0-3.794 23.4c.6.111.82-.26.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.839 1.237 1.839 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.775.419-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.235-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 6.009 0c2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.233 1.911 1.233 3.221 0 4.61-2.807 5.624-5.479 5.921.43.371.815 1.102.815 2.222v3.293c0 .32.216.694.825.576A12.003 12.003 0 0 0 12 .297Z" />
    </svg>
  );
}

export function LandingPage() {
  const auth = useAuth();
  const chat = useBackendVictusChat();
  const demoChat = useDemoVictusChat();
  const { language } = useLanguage();
  const copy = language === 'es' ? {
    product: 'Producto', how: 'Cómo funciona', evidence: 'Evidencia', signIn: 'Ingresar', getStarted: 'Comenzar',
    hero: 'Tu alimentación, convertida en un plan que sí puedes seguir.', description: 'Registra tus comidas, ajusta tu perfil y crea planes de alimentación que se adapten a tu vida. Pregunta con libertad y recibe respuestas respaldadas por evidencia científica.', create: 'Crear mi plan', learn: 'Ver cómo funciona',
    capabilitiesKicker: 'Capacidades', capabilitiesTitle: 'Pregunta, registra y ajusta con contexto.', capabilitiesDescription: 'En esta demo, el perfil de David no se modifica y los registros de comida son temporales. Con tu propia cuenta, Victus también puede trabajar sobre tu perfil y plan.',
    capabilities: [
      ['Registro de comidas', 'Registra comidas y bebidas con cantidades exactas en gramos o mililitros.', '“Comí 180 g de pollo y tomé 250 ml de leche.”', 'Disponible en demo'],
      ['Perfil', 'Consulta y actualiza preferencias, restricciones y objetivos de tu propio perfil.', '“Soy vegetariano; actualiza mis preferencias.”', 'Con tu cuenta'],
      ['Plan de dieta', 'Crea, ajusta o activa un plan de alimentación según tu contexto.', '“Crea un plan para ganar masa muscular.”', 'Con tu cuenta'],
      ['Evidencia', 'Busca evidencia científica breve para responder dudas de nutrición y salud.', '“¿Qué evidencia hay sobre la proteína antes de entrenar?”', 'Pregunta libre'],
    ],
    ragKicker: 'Evidencia en vivo', ragTitle: 'Un RAG que conecta tus preguntas con evidencia.', ragDescription: 'Victus consulta un índice de evidencia científica para fundamentar sus respuestas. Estas cifras se actualizan automáticamente al incorporar nueva evidencia.', papers: 'papers indexados', evidencePassages: 'fragmentos de evidencia', loading: 'Consultando índice de evidencia…', unavailable: 'Las métricas del índice no están disponibles ahora.',
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
    hero: 'Your nutrition, turned into a plan you can actually follow.', description: 'Log meals, adjust your profile and create nutrition plans that fit your life. Ask freely and get answers grounded in scientific evidence.', create: 'Create my plan', learn: 'See how it works',
    capabilitiesKicker: 'Capabilities', capabilitiesTitle: 'Ask, log and adjust with context.', capabilitiesDescription: 'In this demo, David’s profile cannot be changed and meal logs are temporary. With your own account, Victus can also work with your profile and plan.',
    capabilities: [
      ['Meal logging', 'Log meals and drinks with exact quantities in grams or millilitres.', '“I ate 180 g of chicken and drank 250 ml of milk.”', 'Available in demo'],
      ['Profile', 'Review and update preferences, restrictions and goals in your own profile.', '“I am vegetarian; update my preferences.”', 'With your account'],
      ['Diet plan', 'Create, refine or activate a nutrition plan for your context.', '“Create a plan to build muscle.”', 'With your account'],
      ['Evidence', 'Find concise scientific evidence for nutrition and health questions.', '“What evidence supports protein before training?”', 'Ask freely'],
    ],
    ragKicker: 'Live evidence', ragTitle: 'A RAG that connects your questions with evidence.', ragDescription: 'Victus queries a scientific evidence index to ground its responses. These counts refresh automatically as new evidence is added.', papers: 'indexed papers', evidencePassages: 'evidence passages', loading: 'Checking the evidence index…', unavailable: 'Index metrics are unavailable right now.',
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
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats | null>(null);
  const [evidenceStatsUnavailable, setEvidenceStatsUnavailable] = useState(false);
  const day = planDays[activeDay];
  const meal = day.meals[activeMeal];

  useEffect(() => {
    let active = true;
    async function refreshEvidenceStats() {
      try {
        const next = await apiFetch<EvidenceStats>('/api/evidence/stats');
        if (!active) return;
        setEvidenceStats(next);
        setEvidenceStatsUnavailable(false);
      } catch {
        if (active) setEvidenceStatsUnavailable(true);
      }
    }
    void refreshEvidenceStats();
    const intervalId = window.setInterval(() => { void refreshEvidenceStats(); }, 60_000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, []);

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
              href="https://github.com/victus-fit/victus-agent"
              target="_blank"
              rel="noreferrer"
            >
              <GitHubMark />
              <strong>victus-agent</strong>
            </a>
            <button className="vl-btn vl-btn-primary" type="button" onClick={() => navigate('/login')}>
              <LogIn size={16} /> {copy.getStarted}
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
            <FileText size={17} /> {copy.learn}
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

        <div className="vl-container vl-capabilities" aria-labelledby="capabilities-title">
          <div className="vl-capabilities-head">
            <div className="vl-section-kicker">{copy.capabilitiesKicker}</div>
            <h2 id="capabilities-title">{copy.capabilitiesTitle}</h2>
            <p>{copy.capabilitiesDescription}</p>
          </div>
          <div className="vl-capability-grid">
            {copy.capabilities.map(([title, description, example, availability], index) => {
              const Icon = [ClipboardPlus, UserPen, Salad, FileSearch][index]!;
              return (
                <article className="vl-capability" key={title}>
                  <div className="vl-capability-icon"><Icon size={19} strokeWidth={1.8} /></div>
                  <div>
                    <div className="vl-capability-title-row">
                      <h3>{title}</h3>
                      <span>{availability}</span>
                    </div>
                    <p>{description}</p>
                    <blockquote>{example}</blockquote>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="vl-rag" aria-live="polite">
        <div className="vl-container vl-rag-grid">
          <div>
            <div className="vl-section-kicker">{copy.ragKicker}</div>
            <h2>{copy.ragTitle}</h2>
            <p>{copy.ragDescription}</p>
          </div>
          <div className="vl-rag-metrics">
            {evidenceStats ? <>
              <div><strong>{new Intl.NumberFormat(language === 'es' ? 'es-CL' : 'en-US').format(evidenceStats.paper_count)}</strong><span>{copy.papers}</span></div>
              <div><strong>{new Intl.NumberFormat(language === 'es' ? 'es-CL' : 'en-US').format(evidenceStats.evidence_count)}</strong><span>{copy.evidencePassages}</span></div>
            </> : <p className="vl-rag-status">{evidenceStatsUnavailable ? copy.unavailable : copy.loading}</p>}
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
