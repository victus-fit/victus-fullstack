import { AuthProvider } from './auth/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { DemoChatPage } from './pages/DemoChatPage';
import { LandingPage } from './pages/LandingPage';
import { ProtectedAppPage } from './pages/ProtectedAppPage';
import { useRoute } from './lib/navigation';
import { useTheme } from './lib/useTheme';

function AppRoutes() {
  const route = useRoute();
  useTheme();

  if (route === 'demo') return <DemoChatPage />;
  if (route === 'login') return <AuthPage mode="login" />;
  if (route === 'register') return <AuthPage mode="register" />;
  if (route === 'app') return <ProtectedAppPage />;
  return <LandingPage />;
}

export function App() {
  return (
    <AuthProvider>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <AppRoutes />
    </AuthProvider>
  );
}
