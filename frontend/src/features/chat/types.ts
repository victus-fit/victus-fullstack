export type ChatRole = 'assistant' | 'user';
export type ChatStatus = 'ready' | 'submitted' | 'streaming';
export type AgentWorkspace = 'chat' | 'meal-log' | 'weekly-plan' | 'biometrics' | 'profile';

export interface EvidenceReference {
  id: string;
  title: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ChatMessageModel {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  evidence?: EvidenceReference[];
}

export interface TraceStep {
  id: string;
  label: string;
  state: 'pending' | 'active' | 'done';
}

export interface ConversationListItem {
  conversation_id: string;
  workspace_id: string;
  title: string;
  status: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface VictusChatController {
  messages: ChatMessageModel[];
  status: ChatStatus;
  trace: TraceStep[];
  latestEvidence: EvidenceReference[];
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  isLoadingHistory: boolean;
  sendMessage: (text: string) => void;
  reset: () => void;
  refreshConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
}
