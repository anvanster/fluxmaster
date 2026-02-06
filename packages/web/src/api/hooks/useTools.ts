import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ToolSummary } from '@fluxmaster/api-types';

export function useTools() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: () => apiFetch<ToolSummary[]>('/tools'),
  });
}
