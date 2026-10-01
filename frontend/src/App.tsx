import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { ProtectedAppPage } from './pages/ProtectedAppPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { replace, useRoute } from './lib/navigation';
import { useTheme } from './lib/useTheme';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';

function AppRoutes() {
  const route = useRoute();
  const auth = useAuth();
  useTheme();

  useEffect(() => {
    if (!auth.isLoading && auth.user && route !== 'app' && route !== 'onboarding') replace('/app');
  }, [auth.isLoading, auth.user, route]);

  if (auth.isLoading) return <main className="loading-screen" id="main-content" aria-live="polite" />;
  if (auth.user && route === 'onboarding') return <OnboardingPage />;
  if (auth.user) return <ProtectedAppPage />;

  if (route === 'login') return <AuthPage mode="login" />;
  if (route === 'register') return <AuthPage mode="register" />;
  if (route === 'app') return <ProtectedAppPage />;
  return <LandingPage />;
}

function AppContent() { const { t } = useLanguage(); return <><a className="skip-link" href="#main-content">{t('skip')}</a><AppRoutes /></>; }

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider><AppContent /></LanguageProvider>
    </AuthProvider>
  );
}
