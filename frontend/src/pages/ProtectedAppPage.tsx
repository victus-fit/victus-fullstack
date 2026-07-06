import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ChatShell } from '../features/chat/components/ChatShell';
import { useBackendVictusChat } from '../features/chat/hooks/useBackendVictusChat';
import { navigate } from '../lib/navigation';
import type { ThemeName } from '../lib/useTheme';

interface ProtectedAppPageProps {
  theme: ThemeName;
  onToggleTheme: () => void;
}

export function ProtectedAppPage({ theme, onToggleTheme }: ProtectedAppPageProps) {
  const auth = useAuth();
  const chat = useBackendVictusChat();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) navigate('/login');
  }, [auth.isLoading, auth.user]);

  if (auth.isLoading) {
    return (
      <main className="loading-screen">
        <div className="typing-indicator" aria-label="Loading session">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <p>Validando sesión segura…</p>
      </main>
    );
  }

  if (!auth.user) return null;

  return (
    <ChatShell
      mode="app"
      theme={theme}
      user={auth.user}
      chat={chat}
      onToggleTheme={onToggleTheme}
      onLogout={async () => {
        await auth.logout();
        navigate('/');
      }}
    />
  );
}
