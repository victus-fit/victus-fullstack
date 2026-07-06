import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Sun, UserPlus } from 'lucide-react';
import type { AuthUser } from '../../../auth/AuthContext';
import type { ThemeName } from '../../../lib/useTheme';
import { WorkspacePage } from '../../workspaces/components/WorkspacePage';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { Sidebar } from './Sidebar';
import { suggestedPrompts } from '../data/demoResponses';
import type { AgentWorkspace, VictusChatController } from '../types';

interface ChatShellProps {
  theme: ThemeName;
  mode: 'demo' | 'app';
  user?: AuthUser | null;
  chat: VictusChatController;
  onToggleTheme: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
}

export function ChatShell({ theme, mode, user, chat, onToggleTheme, onLogin, onRegister, onLogout }: ChatShellProps) {
  const {
    messages,
    status,
    trace,
    latestEvidence,
    conversations,
    activeConversationId,
    isLoadingHistory,
    sendMessage,
    reset,
    selectConversation,
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
  const statusLabel = status === 'ready' ? (isLoadingHistory ? 'Loading thread' : 'Ready') : activeTraceLabel ?? 'Streaming response';

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
        mode={mode}
        onWorkspaceChange={openWorkspace}
        onNewConversation={newConversation}
        onSelectConversation={openConversation}
      />

      {activeWorkspace === 'chat' ? (
        <main className="chat-main">
          <header className="chat-header">
            <div className="header-title">
              <strong>{mode === 'demo' ? 'Victus Demo' : 'Chat'}</strong>
              <span>{mode === 'demo' ? 'Public preview · register to open your workspace' : statusLabel}</span>
            </div>
            <div className="header-actions">
              <button
                className="icon-button"
                onClick={() => setIsSidebarCollapsed((value) => !value)}
                type="button"
                aria-label={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
              <button className="mode-button" onClick={onToggleTheme} type="button">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button className="secondary-button" onClick={reset} type="button">
                <RotateCcw size={15} /> Nuevo
              </button>
              {mode === 'demo' ? (
                <>
                  <button className="secondary-button auth-secondary" onClick={onLogin} type="button">
                    Login
                  </button>
                  <button className="primary-pill" onClick={onRegister} type="button">
                    <UserPlus size={15} /> Registrarse
                  </button>
                </>
              ) : (
                <>
                  <span className={`user-chip ${user?.is_demo ? 'is-demo' : ''}`}>{user?.display_name ?? user?.primary_email ?? 'Session'}</span>
                  <button className="secondary-button" onClick={onLogout} type="button">
                    <LogOut size={15} /> Logout
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="chat-scroll" ref={scrollRef}>
            <div className="chat-inner">
              {mode === 'demo' ? (
                <div className="demo-note" role="note">
                  <strong>Demo pública</strong>
                  <span>Primera cara de Victus: chat profesional, módulos del agente y preview de evidencia.</span>
                </div>
              ) : user?.is_demo ? (
                <div className="demo-note read-only-note" role="note">
                  <strong>Perfil demo solo lectura</strong>
                  <span>Datos ficticios para mostrar capacidades. Regístrate para guardar tus propios datos.</span>
                </div>
              ) : null}
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
                <span>Evidence</span>
                <strong>{latestEvidence.length ? `${latestEvidence.length} cards` : 'Waiting'}</strong>
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
                <span>Enter to send · Shift + Enter for newline</span>
                <span>{mode === 'demo' ? 'Demo stream' : statusLabel}</span>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <WorkspacePage
          workspace={activeWorkspace}
          user={user}
          sidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      )}
    </div>
  );
}
