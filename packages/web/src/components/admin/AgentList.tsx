import { useState } from 'react';
import { useAgents, useKillAgent } from '@/api/hooks/useAgents';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { StatusDot } from '@/components/common/StatusDot';
import { Spinner } from '@/components/common/Spinner';
import { AgentDetailDrawer } from './AgentDetailDrawer';
import { Wrench, Brain, Zap } from 'lucide-react';
import type { AgentInfoResponse } from '@fluxmaster/api-types';

function providerFromModel(model: string): string {
  if (model.startsWith('claude')) return 'Anthropic';
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'OpenAI';
  if (model.startsWith('gemini')) return 'Google';
  if (model.startsWith('grok')) return 'xAI';
  return 'Unknown';
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  idle: 'success',
  processing: 'warning',
  error: 'error',
  terminated: 'default',
};

function AgentCard({ agent, onClick }: {
  agent: AgentInfoResponse;
  onClick: () => void;
}) {
  const persona = agent.persona;
  const provider = providerFromModel(agent.model);
  const toolCount = agent.tools?.length ?? 0;
  const displayName = persona?.identity.name ?? agent.id;
  const emoji = persona?.identity.emoji;
  const role = persona?.identity.role;
  const traits = persona?.soul.coreTraits.slice(0, 3);
  const hasAutonomy = !!persona?.autonomy;
  const hasMemory = !!persona?.memoryProtocol;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-gray-700 bg-gray-900 p-3 transition-colors hover:border-gray-600 hover:bg-gray-800/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
      data-testid="agent-list-item"
    >
      {/* Header: emoji + name + status */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {emoji && <span className="text-lg shrink-0">{emoji}</span>}
          <span className="text-sm font-medium text-white truncate">{displayName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusDot status={agent.status} />
          <Badge variant={statusVariant[agent.status]} className="text-[10px]">{agent.status}</Badge>
        </div>
      </div>

      {/* Subtitle: role + model + provider */}
      <div className="flex items-center gap-1.5 mb-2 text-[11px] text-gray-400">
        {role && <span className="truncate">{role}</span>}
        {role && <span className="text-gray-600">·</span>}
        <span className="truncate">{agent.model}</span>
        <span className="shrink-0 rounded bg-gray-800 px-1 py-0.5 text-[10px] text-gray-500" data-testid="provider-badge">
          {provider}
        </span>
      </div>

      {/* Trait badges */}
      {traits && traits.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {traits.map((trait) => (
            <span key={trait} className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-300">
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* Footer: tool count + capability indicators */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        {toolCount > 0 && (
          <span className="flex items-center gap-0.5" data-testid="tool-count">
            <Wrench size={10} />
            {toolCount} tools
          </span>
        )}
        {hasAutonomy && (
          <span className="flex items-center gap-0.5 text-yellow-500" data-testid="autonomy-indicator">
            <Zap size={10} />
            autonomous
          </span>
        )}
        {hasMemory && (
          <span className="flex items-center gap-0.5 text-purple-400" data-testid="memory-indicator">
            <Brain size={10} />
            memory
          </span>
        )}
      </div>
    </button>
  );
}

export function AgentList() {
  const { data: agents = [], isLoading } = useAgents();
  const killAgent = useKillAgent();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  if (isLoading) {
    return (
      <Card data-testid="agent-list">
        <h4 className="mb-3 text-sm font-medium text-gray-300">Running Agents</h4>
        <Spinner />
      </Card>
    );
  }

  return (
    <>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => setSelectedAgentId(agent.id)}
              />
            ))}
          </div>
        )}
        {killAgent.isError && <p className="mt-2 text-xs text-red-400">Error: {killAgent.error.message}</p>}
      </Card>

      <AgentDetailDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgentId(null)}
        onKill={(id) => {
          killAgent.mutate(id);
          setSelectedAgentId(null);
        }}
        killPending={killAgent.isPending}
      />
    </>
  );
}
