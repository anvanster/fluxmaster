import { useAgents, useKillAgent } from '@/api/hooks/useAgents';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusDot } from '@/components/common/StatusDot';
import { Spinner } from '@/components/common/Spinner';
import { Trash2 } from 'lucide-react';

export function AgentList() {
  const { data: agents = [], isLoading } = useAgents();
  const killAgent = useKillAgent();

  if (isLoading) {
    return (
      <Card data-testid="agent-list">
        <h4 className="mb-3 text-sm font-medium text-gray-300">Running Agents</h4>
        <Spinner />
      </Card>
    );
  }

  return (
    <Card data-testid="agent-list">
      <h4 className="mb-3 text-sm font-medium text-gray-300">
        Running Agents
        <span className="ml-2 rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300" data-testid="agent-count">
          {agents.length}
        </span>
      </h4>
      {agents.length === 0 ? (
        <p className="text-sm text-gray-500">No agents running</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between rounded border border-gray-700 bg-gray-900 px-3 py-2"
              data-testid="agent-list-item"
            >
              <div className="flex items-center gap-2">
                <StatusDot status={agent.status} />
                <span className="text-sm font-medium text-gray-100">{agent.id}</span>
                <span className="text-xs text-gray-400">({agent.model})</span>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => killAgent.mutate(agent.id)}
                disabled={killAgent.isPending}
                aria-label={`Kill agent ${agent.id}`}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      {killAgent.isError && <p className="mt-2 text-xs text-red-400">Error: {killAgent.error.message}</p>}
    </Card>
  );
}
