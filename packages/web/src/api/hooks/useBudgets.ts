import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import type { BudgetListResponse, BudgetAlertListResponse } from '@fluxmaster/api-types';

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiFetch<BudgetListResponse>('/budgets'),
    refetchInterval: 10_000,
  });
}

export function useBudgetAlerts(options?: { limit?: number }) {
  return useQuery({
    queryKey: ['budgets', 'alerts', options?.limit],
    queryFn: () =>
      apiFetch<BudgetAlertListResponse>(`/budgets/alerts?limit=${options?.limit ?? 50}`),
    refetchInterval: 10_000,
  });
}
