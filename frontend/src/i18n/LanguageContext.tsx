import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getUserSettings, updateUserSettings } from '../features/userData/api';

export type Language = 'en' | 'es';
const storageKey = 'victus-language';
const dictionary = {
  en: { skip: 'Skip to content', language: 'Language', signIn: 'Sign in', getStarted: 'Get started', loadingSession: 'Validating secure session…', chat: 'Chat', newConversation: 'New conversation', user: 'You', profile: 'Profile', mealLog: 'Meal log', weeklyPlan: 'Weekly plan', biometrics: 'Biometrics', today: 'Today', conversations: 'Conversations', loadingConversation: 'Loading conversation', updatedContext: 'Context updated', responding: 'Victus is responding', sendHint: 'Enter to send · Shift + Enter for a new line', askVictus: 'Ask Victus…', searchLanguage: 'Search language', retry: 'Try again', cancel: 'Cancel', save: 'Save', add: 'Add', close: 'Close', searchFood: 'Search food', noResults: 'No results.', loading: 'Loading…', foodOfDay: 'Food for the day', addFood: 'Add food', noFood: 'No food logged.', daySummary: 'Day summary', calories: 'Calories', protein: 'Protein', carbohydrates: 'Carbohydrates', fats: 'Fats' },
  es: { skip: 'Saltar al contenido', language: 'Idioma', signIn: 'Ingresar', getStarted: 'Comenzar', loadingSession: 'Validando sesión segura…', chat: 'Chat', newConversation: 'Nueva conversación', user: 'Tú', profile: 'Perfil', mealLog: 'Registro de comidas', weeklyPlan: 'Plan semanal', biometrics: 'Biométricas', today: 'Hoy', conversations: 'Conversaciones', loadingConversation: 'Cargando conversación', updatedContext: 'Contexto actualizado', responding: 'Victus está respondiendo', sendHint: 'Enter para enviar · Shift + Enter para nueva línea', askVictus: 'Pregunta a Victus…', searchLanguage: 'Idioma de búsqueda', retry: 'Reintentar', cancel: 'Cancelar', save: 'Guardar', add: 'Agregar', close: 'Cerrar', searchFood: 'Buscar alimento', noResults: 'Sin resultados.', loading: 'Cargando…', foodOfDay: 'Alimentos del día', addFood: 'Agregar alimento', noFood: 'Sin alimentos registrados.', daySummary: 'Resumen del día', calories: 'Calorías', protein: 'Proteína', carbohydrates: 'Carbohidratos', fats: 'Grasas' },
} as const;
type Key = keyof typeof dictionary.en;
interface Context { language: Language; locale: string; t: (key: Key) => string; setLanguage: (language: Language) => void; }
const LanguageContext = createContext<Context | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem(storageKey) === 'en' ? 'en' : 'es'));
  const manuallySelected = useRef(false);
  useEffect(() => { void getUserSettings().then((settings) => { if (!manuallySelected.current && localStorage.getItem(storageKey) === 'en') setLanguageState(settings.preferred_language); }).catch(() => undefined); }, []);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem(storageKey, language); }, [language]);
  const setLanguage = useCallback((next: Language) => { manuallySelected.current = true; setLanguageState(next); void updateUserSettings({ preferred_language: next }).catch(() => undefined); }, []);
  const value = useMemo(() => ({ language, locale: language === 'en' ? 'en-US' : 'es-CL', t: (key: Key) => dictionary[language][key], setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { const value = useContext(LanguageContext); if (!value) throw new Error('LanguageProvider is required'); return value; }
