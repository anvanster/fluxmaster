import type { AgentInfoResponse } from '@fluxmaster/api-types';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { StatusDot } from '@/components/common/StatusDot';

interface AgentStatusCardProps {
  agent: AgentInfoResponse;
}

const statusVariant = {
  idle: 'success' as const,
  processing: 'default' as const,
  error: 'error' as const,
  terminated: 'warning' as const,
};

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  return (
    <Card className="flex flex-col gap-2" data-testid="agent-status-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={agent.status} />
          <span className="font-medium text-white">{agent.id}</span>
        </div>
        <Badge variant={statusVariant[agent.status]}>{agent.status}</Badge>
      </div>
      <div className="text-xs text-gray-500">Model: {agent.model}</div>
    </Card>
  );
}
