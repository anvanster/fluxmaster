import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      activeAgentId: 'default',
      conversations: new Map(),
      streaming: new Map(),

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
            const toolCalls = current.toolCalls.map((tc) =>
              tc.name === toolName && tc.status === 'pending'
                ? { ...tc, status: (isError ? 'error' : 'done') as 'error' | 'done', result, isError }
                : tc,
            );
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
    }),
    {
      name: 'fluxmaster-chat',
      partialize: (state) => ({
        activeAgentId: state.activeAgentId,
        conversations: state.conversations,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Deserialize conversations from array of entries back to Map
          if (parsed.state?.conversations) {
            parsed.state.conversations = new Map(
              (parsed.state.conversations as [string, ChatMessage[]][]).map(([k, v]) => [
                k,
                v.map((msg: ChatMessage) => ({ ...msg, timestamp: new Date(msg.timestamp) })),
              ]),
            );
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Serialize Map to array of entries for JSON
          const serializable = {
            ...value,
            state: {
              ...value.state,
              conversations: Array.from((value.state.conversations as Map<string, ChatMessage[]>).entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(serializable));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);
