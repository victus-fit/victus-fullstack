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
    description: 'Ajustes y preguntas sobre tu plan diario.',
    icon: MessageSquareText,
  },
  {
    id: 'diets',
    label: 'Plan semanal',
    description: 'Comidas, adherencia, alternativas y restricciones.',
    icon: Apple,
  },
  {
    id: 'biometrics',
    label: 'Biométricas',
    description: 'Peso, sueño, hábitos y señales de recuperación.',
    icon: Activity,
  },
  {
    id: 'profile',
    label: 'Perfil',
    description: 'Preferencias, objetivos y contexto personal.',
    icon: UserRound,
  },
  {
    id: 'about',
    label: 'Acerca de',
    description: 'Alcance y límites de Victus.',
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
          <strong>victus</strong>
          <span>Plan personal activo</span>
        </div>
      </div>

      <div className="sidebar-section-title">Principal</div>
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
            <MessageSquarePlus size={15} /> Nueva conversación
          </button>
        ) : null}
        {mode === 'demo' ? (
          <button className="thread-item is-active" type="button" onClick={() => onWorkspaceChange('chat')}>
            <strong>Plan para bajar grasa sin perder energía</strong>
            <span>Preview pública.</span>
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
            <span>{mode === 'demo' ? 'Vista pública' : 'Sesión segura'}</span>
            <strong>{mode === 'demo' ? 'Contexto listo' : 'Contexto actualizado'}</strong>
          </div>
        </div>
        <div className="sidebar-architecture">
          <Compass size={14} />
          <span>Dieta · bienestar · preferencias</span>
        </div>
      </div>
    </aside>
  );
}
