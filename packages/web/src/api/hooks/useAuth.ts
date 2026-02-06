import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { AuthStatusResponse } from '@fluxmaster/api-types';

export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: () => apiFetch<AuthStatusResponse>('/auth/status'),
  });
}
