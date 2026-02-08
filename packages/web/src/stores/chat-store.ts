import { create } from 'zustand';

export interface ToolCallInfo {
  name: string;
  status: 'pending' | 'done' | 'error';
  result?: string;
  isError?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
}

export interface StreamingState {
  text: string;
  isStreaming: boolean;
  toolCalls: ToolCallInfo[];
}

interface ChatState {
  activeAgentId: string;
  conversations: Map<string, ChatMessage[]>;
  streaming: Map<string, StreamingState>;
  suggestions: Map<string, string[]>; // requestId → suggestions

  setActiveAgent: (id: string) => void;
  addUserMessage: (agentId: string, id: string, text: string) => void;
  startStream: (requestId: string) => void;
  appendStreamDelta: (requestId: string, text: string) => void;
  addStreamToolCall: (requestId: string, toolName: string) => void;
  updateStreamToolResult: (requestId: string, toolName: string, result: string, isError: boolean) => void;
  finalizeStream: (agentId: string, requestId: string, text: string) => void;
  clearConversation: (agentId: string) => void;
  clearAllConversations: () => void;
  importConversation: (agentId: string, messages: ChatMessage[]) => void;
  setSuggestions: (requestId: string, suggestions: string[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeAgentId: 'default',
  conversations: new Map(),
  streaming: new Map(),
  suggestions: new Map(),

  setActiveAgent: (id) => set({ activeAgentId: id }),

  addUserMessage: (agentId, id, text) =>
    set((state) => {
      const conv = new Map(state.conversations);
      const msgs = [...(conv.get(agentId) ?? [])];
      msgs.push({ id, role: 'user', content: text, timestamp: new Date() });
      conv.set(agentId, msgs);
      return { conversations: conv };
    }),

  startStream: (requestId) =>
    set((state) => {
      const streaming = new Map(state.streaming);
      streaming.set(requestId, { text: '', isStreaming: true, toolCalls: [] });
      return { streaming };
    }),

  appendStreamDelta: (requestId, text) =>
    set((state) => {
      const streaming = new Map(state.streaming);
      const current = streaming.get(requestId);
      if (current) {
        streaming.set(requestId, { ...current, text: current.text + text });
      }
      return { streaming };
    }),

  addStreamToolCall: (requestId, toolName) =>
    set((state) => {
      const streaming = new Map(state.streaming);
      const current = streaming.get(requestId);
      if (current) {
        streaming.set(requestId, {
          ...current,
          toolCalls: [...current.toolCalls, { name: toolName, status: 'pending' }],
        });
      }
      return { streaming };
    }),

  updateStreamToolResult: (requestId, toolName, result, isError) =>
    set((state) => {
      const streaming = new Map(state.streaming);
      const current = streaming.get(requestId);
      if (current) {
        let matched = false;
        const toolCalls = current.toolCalls.map((tc) => {
          if (!matched && tc.name === toolName && tc.status === 'pending') {
            matched = true;
            return { ...tc, status: (isError ? 'error' : 'done') as 'error' | 'done', result, isError };
          }
          return tc;
        });
        streaming.set(requestId, { ...current, toolCalls });
      }
      return { streaming };
    }),

  finalizeStream: (agentId, requestId, text) =>
    set((state) => {
      const conv = new Map(state.conversations);
      const msgs = [...(conv.get(agentId) ?? [])];
      const streamState = state.streaming.get(requestId);
      msgs.push({
        id: requestId,
        role: 'assistant',
        content: text,
        timestamp: new Date(),
        toolCalls: streamState?.toolCalls,
      });
      conv.set(agentId, msgs);

      const streaming = new Map(state.streaming);
      streaming.delete(requestId);
      return { conversations: conv, streaming };
    }),

  clearConversation: (agentId) =>
    set((state) => {
      const conv = new Map(state.conversations);
      conv.delete(agentId);
      return { conversations: conv };
    }),

  clearAllConversations: () =>
    set({ conversations: new Map(), streaming: new Map() }),

  importConversation: (agentId, messages) =>
    set((state) => {
      const conv = new Map(state.conversations);
      conv.set(agentId, messages);
      return { conversations: conv, activeAgentId: agentId };
    }),

  setSuggestions: (requestId, suggestions) =>
    set((state) => {
      const sug = new Map(state.suggestions);
      sug.set(requestId, suggestions);
      return { suggestions: sug };
    }),
}));
