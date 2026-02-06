import type { AgentInfoResponse } from '@fluxmaster/api-types';
import { AgentStatusCard } from './AgentStatusCard';
import { EmptyState } from '@/components/common/EmptyState';

interface AgentStatusGridProps {
  agents: AgentInfoResponse[];
}

export function AgentStatusGrid({ agents }: AgentStatusGridProps) {
  if (agents.length === 0) {
    return <EmptyState title="No agents running" description="Spawn an agent to get started" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="agent-status-grid">
      {agents.map((agent) => (
        <AgentStatusCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
