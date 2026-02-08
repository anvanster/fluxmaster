import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { ModelInfo } from '@fluxmaster/api-types';

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => apiFetch<ModelInfo[]>('/system/models'),
  });
}
