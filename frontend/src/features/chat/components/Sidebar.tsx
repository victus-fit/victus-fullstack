import {
  Activity,
  Apple,
  CalendarDays,
  LogOut,
  MessageSquarePlus,
  MessageSquareText,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { CompassMark } from '../../../components/CompassMark';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { AgentWorkspace, ConversationListItem } from '../types';

interface SidebarProps {
  activeWorkspace: AgentWorkspace;
  activeConversationId: string | null;
  conversations: ConversationListItem[];
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  onWorkspaceChange: (workspace: AgentWorkspace) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onSignOut?: () => Promise<void> | void;
}

const agentApps: Array<{
  id: AgentWorkspace;
  label: string;
  icon: LucideIcon;
}> = [
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquareText,
  },
  {
    id: 'meal-log',
    label: 'Registro de comidas',
    icon: Apple,
  },
  {
    id: 'weekly-plan',
    label: 'Plan semanal',
    icon: CalendarDays,
  },
  {
    id: 'biometrics',
    label: 'Biométricas',
    icon: Activity,
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
  onToggleSidebar,
  onWorkspaceChange,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onSignOut,
}: SidebarProps) {
  const { t } = useLanguage();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteThread(conversationId: string) {
    setDeletingId(conversationId);
    try {
      await onDeleteConversation(conversationId);
      setOpenMenuId(null);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Victus sidebar">
      <div className="brand-row">
        <CompassMark />
        <div className="brand-wordmark" aria-hidden={isCollapsed}>
          <strong>victus</strong>
          <span>Plan personal activo</span>
        </div>
        <div className="sidebar-actions">
          <button
            className="icon-button sidebar-icon-button"
            onClick={onNewConversation}
            type="button"
            aria-label="Nueva conversación"
            title="Nueva conversación"
          >
            <MessageSquarePlus size={15} />
          </button>
          <button
            className="icon-button sidebar-icon-button"
            onClick={onToggleSidebar}
            type="button"
            aria-label={isCollapsed ? 'Mostrar sidebar' : 'Ocultar sidebar'}
            title={isCollapsed ? 'Mostrar sidebar' : 'Ocultar sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </div>

      <div className="sidebar-section-title">Principal</div>
      <nav className="agent-app-list" aria-label="Victus agent applications">
        {agentApps.map((app) => {
          const Icon = app.icon;
          const label = app.id === 'meal-log' ? t('mealLog') : app.id === 'weekly-plan' ? t('weeklyPlan') : app.id === 'biometrics' ? t('biometrics') : t('chat');
          const isActive = activeWorkspace === app.id;
          return (
            <button
              className={`agent-app-item ${isActive ? 'is-active' : ''}`}
              key={app.id}
              onClick={() => onWorkspaceChange(app.id)}
              type="button"
              title={isCollapsed ? label : undefined}
              aria-label={isCollapsed ? label : undefined}
            >
              <span className="agent-app-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <span className="agent-app-copy" aria-hidden={isCollapsed}>
                <strong>{label}</strong>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-section-title sidebar-optional">Conversations</div>
      <div className="thread-list sidebar-optional">
        {conversations.length ? (
          conversations.map((conversation) => (
            <div
              className={`thread-item ${conversation.conversation_id === activeConversationId ? 'is-active' : ''}`}
              key={conversation.conversation_id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectConversation(conversation.conversation_id)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelectConversation(conversation.conversation_id);
              }}
            >
              <span className="thread-copy">
                <strong>{conversation.title}</strong>
                <span>{conversation.pinned ? 'Fijado · ' : ''}{formatThreadDate(conversation.updated_at)}</span>
              </span>
              <span className="thread-menu-wrap">
                <button
                  className="thread-menu-button"
                  type="button"
                  aria-label={`Acciones para ${conversation.title}`}
                  aria-expanded={openMenuId === conversation.conversation_id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuId((current) => current === conversation.conversation_id ? null : conversation.conversation_id);
                  }}
                >
                  <MoreHorizontal size={15} />
                </button>
                {openMenuId === conversation.conversation_id ? (
                  <span className="thread-menu" onClick={(event) => event.stopPropagation()}>
                    <button
                      className="thread-menu-option danger"
                      type="button"
                      disabled={deletingId === conversation.conversation_id}
                      onClick={() => {
                        if (deletingId === conversation.conversation_id) return;
                        if (window.confirm('¿Eliminar esta conversación?')) {
                          void deleteThread(conversation.conversation_id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      {deletingId === conversation.conversation_id ? 'Eliminando' : 'Eliminar'}
                    </button>
                  </span>
                ) : null}
              </span>
            </div>
          ))
        ) : (
          <div className="thread-empty">
            <strong>Sin conversaciones aún</strong>
            <span>Envía un mensaje para crear el primer thread.</span>
          </div>
        )}
      </div>

      {onSignOut ? <div className="sidebar-footer">
        <button className="agent-app-item sidebar-profile-item" type="button" onClick={() => void onSignOut()}>
          <span className="agent-app-icon" aria-hidden="true"><LogOut size={17} strokeWidth={1.9} /></span>
          <span className="agent-app-copy"><strong>Cerrar sesión</strong></span>
        </button>
      </div> : null}
    </aside>
  );
}
