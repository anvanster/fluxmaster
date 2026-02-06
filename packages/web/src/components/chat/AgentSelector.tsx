import type { AgentInfoResponse } from '@fluxmaster/api-types';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/common/StatusDot';

interface AgentSelectorProps {
  agents: AgentInfoResponse[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function AgentSelector({ agents, activeId, onSelect }: AgentSelectorProps) {
  if (agents.length === 0) return null;

  return (
    <div className="flex gap-1 border-b border-gray-800 px-4 py-2" data-testid="agent-selector">
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          className={cn(
            'flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors',
            agent.id === activeId
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
          )}
        >
          <StatusDot status={agent.status} />
          {agent.id}
        </button>
      ))}
    </div>
  );
}
