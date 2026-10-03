import { useEffect, useState } from 'react';
import type { AuthUser } from '../../../auth/AuthContext';
import { Composer } from './Composer';
import { ChatMessage } from './ChatMessage';
import { Sidebar } from './Sidebar';
import { WorkspacePage } from '../../workspaces/components/WorkspacePage';
import { endDemoSession, startDemoSession } from '../../demo/demoSession';
import type { AgentWorkspace, VictusChatController } from '../types';

interface LandingAppPreviewProps {
  user: AuthUser | null;
  chat: VictusChatController;
}

export function LandingAppPreview({ user, chat }: LandingAppPreviewProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= 760);
  const [activeWorkspace, setActiveWorkspace] = useState<AgentWorkspace>('chat');
  const isReady = chat.status === 'ready';

  useEffect(() => {
    if (user) return;
    const sessionId = startDemoSession();
    return () => endDemoSession(sessionId);
  }, [user]);

  function sendMessage(message: string) {
    chat.sendMessage(message);
  }

  function openWorkspace(workspace: AgentWorkspace) {
    setActiveWorkspace(workspace);
    if (window.innerWidth <= 760) setIsSidebarCollapsed(true);
  }

  function newConversation() {
    setActiveWorkspace('chat');
    chat.startNewConversation();
    if (window.innerWidth <= 760) setIsSidebarCollapsed(true);
  }

  return (
    <div className={`app-shell landing-app-preview ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <Sidebar
        activeWorkspace={activeWorkspace}
        activeConversationId={chat.activeConversationId}
        conversations={chat.conversations}
        isCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)}
        onWorkspaceChange={openWorkspace}
        onNewConversation={newConversation}
        onSelectConversation={(id) => { setActiveWorkspace('chat'); void chat.selectConversation(id); if (window.innerWidth <= 760) setIsSidebarCollapsed(true); }}
        onDeleteConversation={chat.deleteConversation}
      />
      <button
        className={`sidebar-backdrop${isSidebarCollapsed ? '' : ' is-visible'}`}
        type="button"
        aria-label="Cerrar navegación"
        tabIndex={isSidebarCollapsed ? -1 : 0}
        onClick={() => setIsSidebarCollapsed(true)}
      />
      {activeWorkspace === 'chat' ? <main className="chat-main">
        <header className="chat-header">
          <div className="header-title"><strong>Chat</strong><span>{isReady ? (user ? 'Victus' : 'Demo temporal · no se guarda') : 'Victus is responding'}</span></div>
        </header>
        <div className="chat-scroll">
          <div className="chat-inner"><div className="messages-stack">
            {chat.messages.slice(-3).map((message) => <ChatMessage key={message.id} message={message} isStreaming={chat.status === 'streaming' && message.text.length === 0} />)}
          </div></div>
        </div>
        <div className="chat-context-strip"><div className="chat-context-inner">
          <div className="context-pill"><span>Profile</span><strong>David · body composition</strong></div>
          <div className="context-pill"><span>Today</span><strong>Training day</strong></div>
        </div></div>
        <div className="composer-wrap"><div className="composer-inner"><Composer status={chat.status} onSend={sendMessage} /></div></div>
      </main> : <WorkspacePage workspace={activeWorkspace} user={user} />}
    </div>
  );
}
