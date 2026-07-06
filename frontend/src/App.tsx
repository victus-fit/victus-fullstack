import { AuthProvider } from './auth/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { ProtectedAppPage } from './pages/ProtectedAppPage';
import { useRoute } from './lib/navigation';
import { useTheme } from './lib/useTheme';

function AppRoutes() {
  const route = useRoute();
  const { theme, toggleTheme } = useTheme();

  if (route === 'login') return <AuthPage mode="login" theme={theme} onToggleTheme={toggleTheme} />;
  if (route === 'register') return <AuthPage mode="register" theme={theme} onToggleTheme={toggleTheme} />;
  if (route === 'app') return <ProtectedAppPage theme={theme} onToggleTheme={toggleTheme} />;
  return <LandingPage theme={theme} onToggleTheme={toggleTheme} />;
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
