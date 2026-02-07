import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { RequestDetailResponse, RequestListResponse } from '@fluxmaster/api-types';

export function useRequestDetail(requestId: string | null) {
  return useQuery({
    queryKey: ['request', requestId],
    queryFn: () => apiFetch<RequestDetailResponse>(`/requests/${requestId}`),
    enabled: !!requestId,
  });
}

export function useRequestHistory(agentId: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['requests', agentId, options?.limit],
    queryFn: () =>
      apiFetch<RequestListResponse>(
        `/requests?agentId=${encodeURIComponent(agentId)}&limit=${options?.limit ?? 50}`,
      ),
    refetchInterval: 5_000,
  });
}
