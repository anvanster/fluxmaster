import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { AgentInfoResponse, SpawnAgentRequest } from '@fluxmaster/api-types';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiFetch<AgentInfoResponse[]>('/agents'),
  });
}

export function useSpawnAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SpawnAgentRequest) =>
      apiFetch<AgentInfoResponse>('/agents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useKillAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/agents/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}
