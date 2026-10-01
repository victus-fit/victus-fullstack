import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { AuthUser } from '../../../auth/AuthContext';
import { WorkspacePage } from '../../workspaces/components/WorkspacePage';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { Sidebar } from './Sidebar';
import type { AgentWorkspace, VictusChatController } from '../types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { getActiveDietPlan } from '../../userData/api';

interface ChatShellProps {
  user?: AuthUser | null;
  chat: VictusChatController;
  onSignOut: () => Promise<void> | void;
  onDeleteAccount?: () => Promise<void>;
}

export function ChatShell({ user, chat, onSignOut, onDeleteAccount }: ChatShellProps) {
  const { t, language } = useLanguage();
  const {
    messages,
    status,
    trace,
    conversations,
    activeConversationId,
    isLoadingHistory,
    sendMessage,
    respondToConfirmation,
    pendingInterrupt,
    selectConversation,
    deleteConversation,
    startNewConversation,
  } = chat;
  const [activeWorkspace, setActiveWorkspace] = useState<AgentWorkspace>('chat');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasActiveDiet, setHasActiveDiet] = useState<boolean | null>(null);
  const [hasRequestedFirstDiet, setHasRequestedFirstDiet] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeWorkspace !== 'chat') return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status, activeWorkspace]);

  useEffect(() => {
    let cancelled = false;
    void getActiveDietPlan()
      .then(({ plan }) => {
        if (!cancelled) setHasActiveDiet(plan !== null);
      })
      .catch(() => {
        if (!cancelled) setHasActiveDiet(null);
      });

    return () => { cancelled = true; };
  }, [status]);

  const latestAssistantId = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant')?.id,
    [messages],
  );

  const activeTraceLabel = trace.find((step) => step.state === 'active')?.label;
  const statusLabel = status === 'ready' ? (isLoadingHistory ? t('loadingConversation') : t('updatedContext')) : activeTraceLabel ?? t('responding');
  const firstDietPrompt = language === 'es'
    ? 'Quiero crear mi primera dieta. Usa mi biometría, objetivo, actividad y preferencias alimentarias actuales para proponer un plan semanal equilibrado con objetivos diarios. Explícame la propuesta antes de activarla.'
    : 'I want to create my first diet. Use my current biometrics, goal, activity and food preferences to propose a balanced weekly plan with daily targets. Explain the proposal before activating it.';
  const firstDietLabel = language === 'es' ? 'Ayúdame con mi primera dieta' : 'Help me create my first diet';

  function openWorkspace(workspace: AgentWorkspace) {
    setActiveWorkspace(workspace);
    if (window.innerWidth <= 760) setIsSidebarCollapsed(true);
  }

  function openConversation(conversationId: string) {
    setActiveWorkspace('chat');
    void selectConversation(conversationId);
    if (window.innerWidth <= 760) setIsSidebarCollapsed(true);
  }

  function newConversation() {
    setActiveWorkspace('chat');
    startNewConversation();
    if (window.innerWidth <= 760) setIsSidebarCollapsed(true);
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <Sidebar
        activeWorkspace={activeWorkspace}
        activeConversationId={activeConversationId}
        conversations={conversations}
        isCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)}
        onWorkspaceChange={openWorkspace}
        onNewConversation={newConversation}
        onSelectConversation={openConversation}
        onDeleteConversation={deleteConversation}
        onSignOut={onSignOut}
      />

      {activeWorkspace === 'chat' ? (
        <main className="chat-main" id="main-content">
          <header className="chat-header">
            <div className="header-title">
              <strong>{user?.display_name ?? 'Tu espacio'}</strong>
              <span>Chat · {statusLabel}</span>
            </div>
          </header>

          <div className="chat-scroll" ref={scrollRef}>
            <div className="chat-inner">
              <div className="messages-stack">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isStreaming={status === 'streaming' && message.id === latestAssistantId}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {hasActiveDiet === false && !hasRequestedFirstDiet ? (
            <div className="chat-context-strip" aria-label="Crear una primera dieta">
              <div className="chat-context-inner">
                <button
                  className="prompt-chip first-diet-prompt"
                  onClick={() => {
                    setHasRequestedFirstDiet(true);
                    sendMessage(firstDietPrompt);
                  }}
                  disabled={status !== 'ready'}
                  type="button"
                >
                  {firstDietLabel}
                </button>
              </div>
            </div>
          ) : null}

          <div className="composer-wrap">
            <div className="composer-inner">
              {pendingInterrupt?.kind === 'confirmation' ? <div className="chat-confirmation"><span>{pendingInterrupt.question}</span><button className="secondary-button" type="button" onClick={() => respondToConfirmation(false)} disabled={status !== 'ready'}>Cancelar</button><button className="primary-pill" type="button" onClick={() => respondToConfirmation(true)} disabled={status !== 'ready'}>Confirmar</button></div> : <Composer status={status} onSend={sendMessage} />}
              <div className="composer-meta">
                <span>{t('sendHint')}</span>
                <span>{statusLabel}</span>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <WorkspacePage
          workspace={activeWorkspace}
          user={user}
          onDeleteAccount={onDeleteAccount}
        />
      )}
    </div>
  );
}
