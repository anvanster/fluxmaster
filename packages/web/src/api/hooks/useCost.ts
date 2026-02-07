import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { CostResponse } from '@fluxmaster/api-types';

export function useCost() {
  return useQuery({
    queryKey: ['cost'],
    queryFn: () => apiFetch<CostResponse>('/system/cost'),
    refetchInterval: 10_000,
  });
}
