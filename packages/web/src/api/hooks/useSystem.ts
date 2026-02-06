import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { HealthResponse, UsageResponse } from '@fluxmaster/api-types';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/system/health'),
    refetchInterval: 10_000,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: () => apiFetch<UsageResponse>('/system/usage'),
    refetchInterval: 5_000,
  });
}
