import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useConversations, useConversationMessages } from '@/api/hooks/useConversations';
import type { ChatMessage, ToolCallInfo } from '@/stores/chat-store';

export interface UseRestoreChatResult {
  isRestoring: boolean;
}

export function useRestoreChat(agentId: string): UseRestoreChatResult {
  const restoredRef = useRef<Set<string>>(new Set());
  const hasMessages = useChatStore((s) => (s.conversations.get(agentId)?.length ?? 0) > 0);

  const shouldRestore = !hasMessages && !restoredRef.current.has(agentId);

  const { data: convList } = useConversations(agentId);
  const latestConvId = shouldRestore ? (convList?.conversations[0]?.id ?? null) : null;

  // Mark as attempted once we know there are no conversations
  if (shouldRestore && convList && convList.conversations.length === 0) {
    restoredRef.current.add(agentId);
  }

  const { data: msgData } = useConversationMessages(latestConvId);

  useEffect(() => {
    if (!shouldRestore || !msgData?.messages.length) return;
    restoredRef.current.add(agentId);

    const converted: ChatMessage[] = msgData.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      toolCalls: m.toolCalls ? (JSON.parse(m.toolCalls) as ToolCallInfo[]) : undefined,
    }));

    useChatStore.getState().importConversation(agentId, converted);
  }, [agentId, shouldRestore, msgData]);

  const isRestoring = shouldRestore && !restoredRef.current.has(agentId);
  return { isRestoring };
}
