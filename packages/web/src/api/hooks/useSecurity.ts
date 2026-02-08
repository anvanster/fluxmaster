import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { AuditListResponse, SecurityPolicyResponse } from '@fluxmaster/api-types';

export function useAuditLog(options?: { agentId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.agentId) params.set('agentId', options.agentId);
  if (options?.limit) params.set('limit', String(options.limit));

  return useQuery({
    queryKey: ['security', 'audit', options?.agentId, options?.limit],
    queryFn: () => apiFetch<AuditListResponse>(`/security/audit?${params}`),
    refetchInterval: 10_000,
  });
}

export function useDeniedCalls(options?: { limit?: number }) {
  return useQuery({
    queryKey: ['security', 'denied', options?.limit],
    queryFn: () =>
      apiFetch<AuditListResponse>(`/security/denied?limit=${options?.limit ?? 50}`),
    refetchInterval: 10_000,
  });
}

export function useSecurityPolicy() {
  return useQuery({
    queryKey: ['security', 'policy'],
    queryFn: () => apiFetch<SecurityPolicyResponse>('/security/policy'),
  });
}
