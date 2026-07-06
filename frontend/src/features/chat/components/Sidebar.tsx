import {
  Activity,
  Apple,
  Compass,
  FileText,
  MessageSquarePlus,
  MessageSquareText,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { CompassMark } from '../../../components/CompassMark';
import type { AgentWorkspace, ConversationListItem } from '../types';

interface SidebarProps {
  activeWorkspace: AgentWorkspace;
  activeConversationId: string | null;
  conversations: ConversationListItem[];
  isCollapsed: boolean;
  mode: 'demo' | 'app';
  onWorkspaceChange: (workspace: AgentWorkspace) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
}

const agentApps: Array<{
  id: AgentWorkspace;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Conversación principal con evidencia y recomendaciones.',
    icon: MessageSquareText,
  },
  {
    id: 'diets',
    label: 'Dietas',
    description: 'Planes, adherencia, ajustes y restricciones alimentarias.',
    icon: Apple,
  },
  {
    id: 'biometrics',
    label: 'Biometrics',
    description: 'Peso, sueño, presión, hábitos y señales de recuperación.',
    icon: Activity,
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Preferencias, objetivos, contexto y datos persistentes.',
    icon: UserRound,
  },
  {
    id: 'about',
    label: 'About',
    description: 'Qué demuestra esta V1 y cómo se conecta con FastAPI.',
    icon: FileText,
  },
];

function formatThreadDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Thread';
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(date);
}

export function Sidebar({
  activeWorkspace,
  activeConversationId,
  conversations,
  isCollapsed,
  mode,
  onWorkspaceChange,
  onNewConversation,
  onSelectConversation,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Victus sidebar">
      <div className="brand-row">
        <CompassMark />
        <div className="brand-wordmark" aria-hidden={isCollapsed}>
          <strong>Victus</strong>
          <span>Scientific health intelligence</span>
        </div>
      </div>

      <div className="sidebar-section-title">Agent apps</div>
      <nav className="agent-app-list" aria-label="Victus agent applications">
        {agentApps.map((app) => {
          const Icon = app.icon;
          const isActive = activeWorkspace === app.id;
          return (
            <button
              className={`agent-app-item ${isActive ? 'is-active' : ''}`}
              key={app.id}
              onClick={() => onWorkspaceChange(app.id)}
              type="button"
              title={isCollapsed ? app.label : undefined}
              aria-label={isCollapsed ? app.label : undefined}
            >
              <span className="agent-app-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <span className="agent-app-copy" aria-hidden={isCollapsed}>
                <strong>{app.label}</strong>
                <span>{app.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-section-title sidebar-optional">Conversations</div>
      <div className="thread-list sidebar-optional">
        {mode === 'app' ? (
          <button className="thread-action" type="button" onClick={onNewConversation}>
            <MessageSquarePlus size={15} /> Nuevo chat
          </button>
        ) : null}
        {mode === 'demo' ? (
          <button className="thread-item is-active" type="button" onClick={() => onWorkspaceChange('chat')}>
            <strong>Public demo</strong>
            <span>Primera cara de la app.</span>
          </button>
        ) : conversations.length ? (
          conversations.map((conversation) => (
            <button
              className={`thread-item ${conversation.conversation_id === activeConversationId ? 'is-active' : ''}`}
              key={conversation.conversation_id}
              type="button"
              onClick={() => onSelectConversation(conversation.conversation_id)}
            >
              <strong>{conversation.title}</strong>
              <span>{conversation.pinned ? 'Fijado · ' : ''}{formatThreadDate(conversation.updated_at)}</span>
            </button>
          ))
        ) : (
          <div className="thread-empty">
            <strong>Sin conversaciones aún</strong>
            <span>Envía un mensaje para crear el primer thread.</span>
          </div>
        )}
      </div>

      <div className="sidebar-footer sidebar-optional">
        <div className="sidebar-status-card">
          <span className="status-dot" />
          <div>
            <span>{mode === 'demo' ? 'Public demo' : 'Secure session'}</span>
            <strong>{mode === 'demo' ? 'Mock stream ready' : 'FastAPI gateway'}</strong>
          </div>
        </div>
        <div className="sidebar-architecture">
          <Compass size={14} />
          <span>React → FastAPI → LangGraph</span>
        </div>
      </div>
    </aside>
  );
}
