import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { LogOut, PanelLeftClose, PanelLeftOpen, RotateCcw, UserPlus } from 'lucide-react';
import type { AuthUser } from '../../../auth/AuthContext';
import { WorkspacePage } from '../../workspaces/components/WorkspacePage';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { Sidebar } from './Sidebar';
import { suggestedPrompts } from '../data/demoResponses';
import type { AgentWorkspace, VictusChatController } from '../types';

interface ChatShellProps {
  mode: 'demo' | 'app';
  user?: AuthUser | null;
  chat: VictusChatController;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
}

export function ChatShell({ mode, user, chat, onLogin, onRegister, onLogout }: ChatShellProps) {
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
  const statusLabel = status === 'ready' ? (isLoadingHistory ? 'Cargando conversación' : 'Contexto actualizado') : activeTraceLabel ?? 'Victus está respondiendo';

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
        <main className="chat-main" id="main-content">
          <header className="chat-header">
            <div className="header-title">
              <strong>{mode === 'demo' ? 'Plan para bajar grasa sin perder energía' : 'Chat'}</strong>
              <span>{mode === 'demo' ? 'Victus utiliza tu perfil y progreso reciente' : statusLabel}</span>
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
              <button className="secondary-button" onClick={reset} type="button">
                <RotateCcw size={15} /> Nuevo
              </button>
              {mode === 'demo' ? (
                <>
                  <button className="secondary-button auth-secondary" onClick={onLogin} type="button">
                    Ingresar
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
                  <strong>Vista pública</strong>
                  <span>Prueba cómo Victus adapta un plan alimentario con preferencias, hábitos y biométricas.</span>
                </div>
              ) : user?.is_demo ? (
                <div className="demo-note read-only-note" role="note">
                  <strong>Perfil de prueba solo lectura</strong>
                  <span>Datos ficticios para mostrar capacidades. Crea una cuenta para guardar tus propios datos.</span>
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
                <span>Enter para enviar · Shift + Enter para nueva línea</span>
                <span>{mode === 'demo' ? 'Vista de bienestar' : statusLabel}</span>
              </div>
            </div>
          </div>
        </main>
      ) : null}

      {activeWorkspace === 'chat' ? (
        <aside className="chat-context-panel" aria-label="Tu contexto">
          <div className="context-title">
            <strong>Tu contexto</strong>
            <span>Editar</span>
          </div>
          <div className="context-card">
            <div className="context-label">Objetivo</div>
            <div className="context-value">Reducir grasa corporal manteniendo energía y rendimiento.</div>
          </div>
          <div className="context-card">
            <div className="context-label">Esta semana</div>
            <div className="metric-line">
              <strong>71%</strong>
              <span>adherencia</span>
            </div>
            <div className="progress">
              <span style={{ width: '71%' }} />
            </div>
          </div>
          <div className="context-card">
            <div className="context-label">Preferencias</div>
            <div className="mini-list">
              <div className="mini-item">
                <span>Cocina rápida</span>
                <span>Activa</span>
              </div>
              <div className="mini-item">
                <span>Sin mariscos</span>
                <span>Restricción</span>
              </div>
              <div className="mini-item">
                <span>Presupuesto</span>
                <span>Medio</span>
              </div>
            </div>
          </div>
          <div className="context-card">
            <div className="context-label">Últimas biométricas</div>
            <div className="mini-list">
              <div className="mini-item">
                <span>Peso</span>
                <span>78,4 kg</span>
              </div>
              <div className="mini-item">
                <span>Sueño promedio</span>
                <span>7 h 08 min</span>
              </div>
              <div className="mini-item">
                <span>Pasos diarios</span>
                <span>7.820</span>
              </div>
            </div>
          </div>
          <div className="context-card">
            <div className="context-label">Patrón detectado</div>
            <div className="context-value">Tu hambre aumenta entre las 17:00 y 19:00 los días de trabajo presencial.</div>
          </div>
        </aside>
      ) : (
        <WorkspacePage
          workspace={activeWorkspace}
          user={user}
          sidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)}
        />
      )}
    </div>
  );
}
