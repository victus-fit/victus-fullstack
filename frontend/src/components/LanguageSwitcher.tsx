import { Languages } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
export function LanguageSwitcher() { const { language, setLanguage } = useLanguage(); const next = language === 'en' ? 'es' : 'en'; return <button className="language-switcher" type="button" onClick={() => setLanguage(next)} aria-label={`Switch to ${next === 'en' ? 'English' : 'Spanish'}`} title={`Switch to ${next === 'en' ? 'English' : 'Spanish'}`}><Languages size={15} /><span>{next.toUpperCase()}</span></button>; }
