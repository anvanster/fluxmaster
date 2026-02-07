import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ConversationListResponse, ConversationSummaryResponse } from '@fluxmaster/api-types';

export function useConversations(agentId: string) {
  return useQuery({
    queryKey: ['conversations', agentId],
    queryFn: () =>
      apiFetch<ConversationListResponse>(`/conversations?agentId=${encodeURIComponent(agentId)}`),
    refetchInterval: 10_000,
  });
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => apiFetch<ConversationSummaryResponse>(`/conversations/${conversationId}`),
    enabled: !!conversationId,
  });
}

export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      apiFetch<{ id: string; title: string }>(`/conversations/${conversationId}/title`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
    },
  });
}
