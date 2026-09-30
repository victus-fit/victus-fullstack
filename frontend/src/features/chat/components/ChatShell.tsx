import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { AuthUser } from '../../../auth/AuthContext';
import { WorkspacePage } from '../../workspaces/components/WorkspacePage';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { Sidebar } from './Sidebar';
import { suggestedPrompts } from '../data/chatContent';
import type { AgentWorkspace, VictusChatController } from '../types';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { useLanguage } from '../../../i18n/LanguageContext';

interface ChatShellProps {
  user?: AuthUser | null;
  chat: VictusChatController;
  onSignOut: () => Promise<void> | void;
}

export function ChatShell({ user, chat, onSignOut }: ChatShellProps) {
  const { t } = useLanguage();
  const {
    messages,
    status,
    trace,
    latestEvidence,
    conversations,
    activeConversationId,
    isLoadingHistory,
    sendMessage,
    selectConversation,
    deleteConversation,
    startNewConversation,
  } = chat;
  const [activeWorkspace, setActiveWorkspace] = useState<AgentWorkspace>('chat');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeWorkspace !== 'chat') return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status, activeWorkspace]);

  const latestAssistantId = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant')?.id,
    [messages],
  );

  const activeTraceLabel = trace.find((step) => step.state === 'active')?.label;
  const statusLabel = status === 'ready' ? (isLoadingHistory ? t('loadingConversation') : t('updatedContext')) : activeTraceLabel ?? t('responding');

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
              <strong>Chat</strong>
              <span>{statusLabel}</span>
            </div>
            <LanguageSwitcher />
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

          <div className="chat-context-strip" aria-label="Current chat context">
            <div className="chat-context-inner">
              <div className="context-pill">
                <span>Trace</span>
                <strong>{statusLabel}</strong>
              </div>
              <div className="context-pill">
                <span>Evidencia</span>
                <strong>{latestEvidence.length ? `${latestEvidence.length} tarjetas` : 'Pendiente'}</strong>
              </div>
              <div className="prompt-row" aria-label="Suggested prompts">
                {suggestedPrompts.map((prompt) => (
                  <button
                    className="prompt-chip"
                    key={prompt.title}
                    onClick={() => sendMessage(prompt.body)}
                    disabled={status !== 'ready'}
                    type="button"
                  >
                    {prompt.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="composer-wrap">
            <div className="composer-inner">
              <Composer status={status} onSend={sendMessage} />
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
        />
      )}
    </div>
  );
}
