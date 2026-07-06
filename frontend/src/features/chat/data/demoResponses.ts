import type { EvidenceReference } from '../types';

export const suggestedPrompts = [
  {
    title: 'Evaluar una recomendación',
    body: '¿Qué tan sólida es la evidencia para aumentar proteína en una fase de recomposición?',
  },
  {
    title: 'Comparar decisiones',
    body: 'Compara déficit calórico leve vs agresivo para adherencia y preservación muscular.',
  },
  {
    title: 'Revisar riesgo',
    body: 'Tengo sueño bajo, estrés alto y quiero entrenar fuerte hoy. ¿Qué conviene ajustar?',
  },
];

export const openingAssistantMessage =
  'Bienvenido a Victus. Estoy listo para responder con orientación científica, evidencia resumida y recomendaciones accionables. Puedes escribir una consulta o probar una sugerencia rápida.';

export const defaultEvidence: EvidenceReference[] = [
  {
    id: 'ev-protein-01',
    title: 'Protein intake and lean mass retention',
    summary: 'La recomendación se apoya mejor cuando se cruza objetivo, déficit energético, entrenamiento de fuerza y adherencia esperada.',
    confidence: 'high',
  },
  {
    id: 'ev-adherence-02',
    title: 'Diet adherence as primary constraint',
    summary: 'El beneficio práctico cae si la intervención no puede sostenerse. Victus separa plausibilidad fisiológica de utilidad operativa.',
    confidence: 'medium',
  },
];

export function buildDemoAnswer(prompt: string) {
  const lower = prompt.toLowerCase();

  if (lower.includes('riesgo') || lower.includes('sueño') || lower.includes('estrés')) {
    return {
      text:
        'Mi lectura inicial: no conviene tratar esto como una pregunta aislada de entrenamiento. Con sueño bajo y estrés alto, Victus priorizaría reducir daño operativo antes de optimizar rendimiento.\n\nRecomendación demo: mantener la sesión, pero bajar intensidad, evitar volumen extra y registrar cómo responde tu recuperación. La respuesta final debería depender de métricas recientes, historial de adherencia y señales de fatiga.',
      evidence: [
        {
          id: 'ev-fatigue-01',
          title: 'Recovery constraints before performance optimization',
          summary: 'Cuando el contexto de recuperación empeora, la recomendación cambia desde maximizar estímulo hacia controlar riesgo y adherencia.',
          confidence: 'medium' as const,
        },
      ],
    };
  }

  if (lower.includes('compar') || lower.includes('déficit') || lower.includes('deficit')) {
    return {
      text:
        'Para una demo empresarial, Victus debería responder como sistema de decisión, no como enciclopedia.\n\nDéficit leve: menor fricción, mejor adherencia, más lento. Déficit agresivo: progreso visible más rápido, pero mayor riesgo de hambre, fatiga y abandono. La elección no debería salir solo de literatura general, sino del perfil del usuario, historial de cumplimiento y tolerancia al cambio.',
      evidence: defaultEvidence,
    };
  }

  return {
    text:
      'Respuesta demo: la evidencia no se debe presentar como una lista plana de papers. Victus debería sintetizar dirección, confianza, aplicabilidad y límites.\n\nPara esta pregunta, separaría cuatro capas: población comparable, intervención exacta, outcome principal y restricciones del usuario. Luego mostraría una recomendación breve con tarjetas de evidencia verificables, sin sobrecargar el chat.',
    evidence: defaultEvidence,
  };
}
