import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { FluxmasterConfig } from '@fluxmaster/api-types';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<FluxmasterConfig>('/config'),
  });
}

export function useDefaultConfig() {
  return useQuery({
    queryKey: ['config', 'default'],
    queryFn: () => apiFetch<FluxmasterConfig>('/config/default'),
  });
}
