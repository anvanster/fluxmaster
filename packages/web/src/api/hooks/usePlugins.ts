import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

interface PluginInfo {
  package: string;
  config: Record<string, unknown>;
}

export function usePlugins() {
  return useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<PluginInfo[]>('/plugins'),
  });
}
