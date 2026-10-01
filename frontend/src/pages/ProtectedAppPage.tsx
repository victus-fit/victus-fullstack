import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ChatShell } from '../features/chat/components/ChatShell';
import { useBackendVictusChat } from '../features/chat/hooks/useBackendVictusChat';
import { navigate } from '../lib/navigation';
import { useLanguage } from '../i18n/LanguageContext';
import { apiFetch } from '../lib/api';

export function ProtectedAppPage() {
  const auth = useAuth();
  const { t } = useLanguage();
  const chat = useBackendVictusChat();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  async function signOut() {
    await auth.logout();
    navigate('/');
  }

  async function deleteAccount() {
    await auth.deleteAccount();
    navigate('/');
  }

  useEffect(() => {
    if (!auth.isLoading && !auth.user) navigate('/login');
  }, [auth.isLoading, auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    void apiFetch<{ completed: boolean }>('/api/users/me/onboarding').then(({ completed }) => { if (!completed) navigate('/onboarding'); }).finally(() => setOnboardingChecked(true));
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user || chat.status !== 'ready') return;
    const message = window.localStorage.getItem('victus-pending-message');
    if (!message) return;
    window.localStorage.removeItem('victus-pending-message');
    chat.startNewConversation();
    chat.sendMessage(message);
  }, [auth.user, chat]);

  if (auth.isLoading) {
    return (
      <main className="loading-screen" id="main-content">
        <div className="typing-indicator" aria-label="Loading session">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <p>{t('loadingSession')}</p>
      </main>
    );
  }

  if (!auth.user || !onboardingChecked) return null;

  return (
    <ChatShell
      user={auth.user}
      chat={chat}
      onSignOut={signOut}
      onDeleteAccount={deleteAccount}
    />
  );
}
