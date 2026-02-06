import { Card } from '@/components/common/Card';
import { formatTokens } from '@/lib/utils';

interface UsageChartProps {
  byAgent: Record<string, { inputTokens: number; outputTokens: number; requestCount: number }>;
}

export function UsageChart({ byAgent }: UsageChartProps) {
  const entries = Object.entries(byAgent);
  if (entries.length === 0) return null;

  const maxTokens = Math.max(...entries.map(([, u]) => u.inputTokens + u.outputTokens), 1);

  return (
    <Card data-testid="usage-chart">
      <div className="mb-2 text-sm font-medium text-gray-300">Usage by Agent</div>
      <div className="space-y-2">
        {entries.map(([agentId, usage]) => {
          const total = usage.inputTokens + usage.outputTokens;
          const pct = Math.round((total / maxTokens) * 100);
          return (
            <div key={agentId}>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{agentId}</span>
                <span>{formatTokens(total)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-800">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
