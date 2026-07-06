import type { TraceStep } from '../types';

export const baseTrace: TraceStep[] = [
  { id: 'normalize', label: 'Normalize request', state: 'pending' },
  { id: 'retrieve', label: 'Retrieve evidence context', state: 'pending' },
  { id: 'compose', label: 'Compose grounded answer', state: 'pending' },
];

export function nowLabel() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

export function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function traceWith(activeIndex: number): TraceStep[] {
  return baseTrace.map((step, index) => ({
    ...step,
    state: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending',
  }));
}
