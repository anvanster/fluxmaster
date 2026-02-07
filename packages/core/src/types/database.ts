export interface StoredMessage {
  id: string;
  conversationId: string;
  agentId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: string; // JSON serialized ToolCallInfo[]
  timestamp: Date;
}

export interface ConversationSummary {
  id: string;
  agentId: string;
  title?: string;
  messageCount: number;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface StoredEvent {
  id: string;
  type: string;
  agentId?: string;
  requestId?: string;
  payload: string; // JSON serialized event data
  timestamp: Date;
}

export interface UsageEntry {
  id: string;
  agentId: string;
  requestId?: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
}

export interface AggregatedUsage {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

export interface ToolCallTiming {
  toolName: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  isError: boolean;
}

export interface RequestRecord {
  id: string;
  agentId: string;
  conversationId: string | null;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  startedAt: Date;
  firstTokenAt?: Date;
  completedAt?: Date;
  inputTokens?: number;
  outputTokens?: number;
  iterations?: number;
  toolCalls: ToolCallTiming[];
  errorMessage?: string;
}

export interface IConversationStore {
  createConversation(id: string, agentId: string): void;
  saveMessage(conversationId: string, message: StoredMessage): void;
  getMessages(conversationId: string): StoredMessage[];
  clearMessages(conversationId: string): void;
  listConversations(agentId: string): ConversationSummary[];
  getConversation(conversationId: string): ConversationSummary | undefined;
  deleteConversation(conversationId: string): void;
  updateConversationTitle(conversationId: string, title: string): void;
}

export interface IEventStore {
  saveEvent(event: StoredEvent): void;
  getEventsByRequest(requestId: string): StoredEvent[];
  getEventsByAgent(agentId: string, limit?: number): StoredEvent[];
  pruneOldEvents(maxAgeSeconds: number): number;
}

export interface IUsageStore {
  recordUsage(entry: UsageEntry): void;
  getAgentUsage(agentId: string): AggregatedUsage;
  getTotalUsage(): AggregatedUsage;
  getAllUsage(): Record<string, AggregatedUsage>;
  getUsageHistory(agentId: string, limit?: number): UsageEntry[];
}

export interface IRequestStore {
  saveRequest(request: RequestRecord): void;
  updateRequest(requestId: string, updates: Partial<RequestRecord>): void;
  getRequest(requestId: string): RequestRecord | undefined;
  listRequests(agentId: string, options?: { limit?: number; offset?: number }): RequestRecord[];
}
