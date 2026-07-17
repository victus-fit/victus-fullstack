import type { EvidenceReference } from '../types';

export const suggestedPrompts = [
  {
    title: 'Ajustar almuerzo',
    body: 'Hoy tengo poco tiempo para almorzar. ¿Puedes cambiar mi almuerzo sin romper el plan?',
  },
  {
    title: 'Día de entrenamiento',
    body: 'Hoy entreno después del trabajo y suelo llegar con mucha hambre. ¿Qué conviene ajustar?',
  },
  {
    title: 'Cena liviana',
    body: 'Quiero una cena más liviana, pero sin quedarme con hambre antes de dormir.',
  },
];

export const openingAssistantMessage =
  'Podemos hacerlo sin una restricción extrema. Por tu nivel de actividad y tu hambre de la tarde, mantendría tres comidas principales y una colación estratégica. Dime qué quieres ajustar hoy.';

export const defaultEvidence: EvidenceReference[] = [
  {
    id: 'ev-protein-01',
    title: 'Distribución de proteína',
    summary: 'La recomendación cambia según objetivo, déficit energético, entrenamiento de fuerza y adherencia esperada.',
    confidence: 'high',
  },
  {
    id: 'ev-adherence-02',
    title: 'Adherencia como restricción principal',
    summary: 'El beneficio práctico cae si la intervención no puede sostenerse. Victus prioriza cambios realistas.',
    confidence: 'medium',
  },
];

export function buildDemoAnswer(prompt: string) {
  const lower = prompt.toLowerCase();

  if (lower.includes('cena') || lower.includes('dormir') || lower.includes('sueño')) {
    return {
      text:
        'Sí. Mantendría la cena más simple sin convertirla en una comida insuficiente.\n\nPara hoy usaría proteína magra, verduras cocidas y una porción moderada de carbohidrato fácil de digerir. Si cenarás tarde, movería parte de la energía a la colación de la tarde para que la cena no tenga que resolver todo el hambre del día.',
      evidence: [
        {
          id: 'ev-dinner-01',
          title: 'Cena tardía y adherencia',
          summary: 'Cuando el usuario cena tarde, Victus ajusta distribución energética antes de reducir comida de forma brusca.',
          confidence: 'medium' as const,
        },
      ],
    };
  }

  if (lower.includes('entreno') || lower.includes('entrenamiento') || lower.includes('hambre')) {
    return {
      text:
        'Como entrenas después del trabajo y sueles llegar con hambre, no bajaría la colación. La haría más útil.\n\nMantendría una colación con carbohidrato y proteína entre 60 y 90 minutos antes de entrenar. Para la cena, dejaría una comida completa pero fácil: salmón o pollo, papa cocida o arroz, y verduras. Así reduces el impulso de picar sin sentir que fallaste el plan.',
      evidence: defaultEvidence,
    };
  }

  return {
    text:
      'Puedo ajustarlo sin reiniciar el plan.\n\nPara un almuerzo rápido mantendría el mismo propósito nutricional: proteína suficiente, una base de carbohidrato simple y vegetales fáciles. Cambiaría el bowl por un wrap de pollo y verduras o una ensalada tibia preparada la noche anterior. La idea es reducir fricción, no perseguir una comida perfecta.',
    evidence: defaultEvidence,
  };
}
