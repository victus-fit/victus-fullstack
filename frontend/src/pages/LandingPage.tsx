import type { ThemeName } from '../lib/useTheme';
import { navigate } from '../lib/navigation';
import { ChatShell } from '../features/chat/components/ChatShell';
import { useMockVictusChat } from '../features/chat/hooks/useMockVictusChat';

interface LandingPageProps {
  theme: ThemeName;
  onToggleTheme: () => void;
}

export function LandingPage({ theme, onToggleTheme }: LandingPageProps) {
  const chat = useMockVictusChat();

  return (
    <ChatShell
      mode="demo"
      theme={theme}
      chat={chat}
      onToggleTheme={onToggleTheme}
      onLogin={() => navigate('/login')}
      onRegister={() => navigate('/register')}
    />
  );
}
