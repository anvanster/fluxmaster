import { useState } from 'react';
import { useAgents, useKillAgent } from '@/api/hooks/useAgents';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusDot } from '@/components/common/StatusDot';
import { Spinner } from '@/components/common/Spinner';
import { Trash2, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import type { AgentInfoResponse } from '@fluxmaster/api-types';

function providerFromModel(model: string): string {
  if (model.startsWith('claude')) return 'Anthropic';
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'OpenAI';
  if (model.startsWith('gemini')) return 'Google';
  if (model.startsWith('grok')) return 'xAI';
  return 'Unknown';
}

function AgentCard({ agent, onKill, killPending }: {
  agent: AgentInfoResponse;
  onKill: () => void;
  killPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const provider = providerFromModel(agent.model);
  const toolCount = agent.tools?.length ?? 0;

  return (
    <div
      className="rounded border border-gray-700 bg-gray-900"
      data-testid="agent-list-item"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-300 shrink-0"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} agent ${agent.id}`}
            data-testid={`expand-${agent.id}`}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <StatusDot status={agent.status} />
          <span className="text-sm font-medium text-gray-100 truncate">{agent.id}</span>
          <span className="text-xs text-gray-400 truncate">{agent.model}</span>
          <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400" data-testid="provider-badge">
            {provider}
          </span>
          {toolCount > 0 && (
            <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-gray-500" data-testid="tool-count">
              <Wrench size={10} />
              {toolCount}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="danger"
          onClick={onKill}
          disabled={killPending}
          aria-label={`Kill agent ${agent.id}`}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-3 py-2 space-y-2" data-testid={`details-${agent.id}`}>
          {agent.systemPrompt && (
            <div>
              <span className="text-[10px] uppercase text-gray-500">System Prompt</span>
              <p className="mt-0.5 text-xs text-gray-300 whitespace-pre-wrap line-clamp-4">
                {agent.systemPrompt}
              </p>
            </div>
          )}
          {toolCount > 0 && (
            <div>
              <span className="text-[10px] uppercase text-gray-500">Tools</span>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {agent.tools!.map((tool) => (
                  <span key={tool} className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-4">
            {agent.temperature != null && (
              <div>
                <span className="text-[10px] uppercase text-gray-500">Temperature</span>
                <p className="text-xs text-gray-300">{agent.temperature}</p>
              </div>
            )}
            {agent.maxTokens != null && (
              <div>
                <span className="text-[10px] uppercase text-gray-500">Max Tokens</span>
                <p className="text-xs text-gray-300">{agent.maxTokens.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
            <AgentCard
              key={agent.id}
              agent={agent}
              onKill={() => killAgent.mutate(agent.id)}
              killPending={killAgent.isPending}
            />
          ))}
        </div>
      )}
      {killAgent.isError && <p className="mt-2 text-xs text-red-400">Error: {killAgent.error.message}</p>}
    </Card>
  );
}
