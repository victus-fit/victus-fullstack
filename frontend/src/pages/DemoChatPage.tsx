import { navigate } from '../lib/navigation';
import { ChatShell } from '../features/chat/components/ChatShell';
import { useMockVictusChat } from '../features/chat/hooks/useMockVictusChat';

export function DemoChatPage() {
  const chat = useMockVictusChat();

  return (
    <ChatShell
      mode="demo"
      chat={chat}
      onLogin={() => navigate('/login')}
      onRegister={() => navigate('/register')}
    />
  );
}
