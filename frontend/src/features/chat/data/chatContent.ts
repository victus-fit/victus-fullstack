export const suggestedPrompts = [
  {
    title: 'Adjust lunch',
    body: 'I have little time for lunch today. Can you change it without disrupting my plan?',
  },
  {
    title: 'Training day',
    body: 'I train after work today and usually get very hungry. What should I adjust?',
  },
  {
    title: 'Light dinner',
    body: 'I want a lighter dinner without being hungry before bed.',
  },
];

const openingAssistantMessages = {
  es: [
    '¡Hola! Soy Victus. Puedo ayudarte a registrar comidas, entender tu progreso y ajustar tu alimentación. ¿Qué te gustaría trabajar hoy?',
    'Estoy aquí para hacer que tu plan sea más fácil de seguir. Podemos revisar una comida, tus preferencias o tu rutina. ¿Por dónde empezamos?',
    'Podemos crear o ajustar tu dieta según tu objetivo, actividad y gustos. ¿Quieres revisar tu plan actual o preparar uno nuevo?',
    'Cuéntame qué comiste, qué entrenamiento tienes o qué te está costando mantener. Buscaré un ajuste práctico para tu día.',
    'También puedo explicarte la evidencia detrás de una recomendación y adaptarla a tu contexto. ¿Qué duda de nutrición tienes hoy?',
  ],
  en: [
    'Hi! I’m Victus. I can help you log meals, understand your progress, and adjust your nutrition. What would you like to work on today?',
    'I’m here to make your plan easier to follow. We can review a meal, your preferences, or your routine. Where should we start?',
    'We can create or refine your diet around your goal, activity, and tastes. Would you like to review your current plan or make a new one?',
    'Tell me what you ate, how you are training, or what feels hard to maintain. I’ll help you find a practical adjustment for today.',
    'I can also explain the evidence behind a recommendation and adapt it to your context. What nutrition question do you have today?',
  ],
} as const;

let nextOpeningMessageIndex = 0;

export function openingAssistantMessage(language: 'es' | 'en'): string {
  const messages = openingAssistantMessages[language];
  const message = messages[nextOpeningMessageIndex % messages.length]!;
  nextOpeningMessageIndex += 1;
  return message;
}
