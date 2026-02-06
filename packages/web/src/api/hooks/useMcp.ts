import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { McpServerInfo } from '@fluxmaster/api-types';

interface McpListResponse {
  configured: McpServerInfo[];
  running: string[];
}

export function useMcpServers() {
  return useQuery({
    queryKey: ['mcp'],
    queryFn: () => apiFetch<McpListResponse>('/mcp'),
  });
}

export function useStartMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ name: string; toolCount: number }>(`/mcp/${name}/start`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp'] }),
  });
}

export function useStopMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<void>(`/mcp/${name}/stop`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp'] }),
  });
}
