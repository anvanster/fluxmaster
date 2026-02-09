import { formatDuration, formatTokens, formatDate } from '@/lib/utils';
import { ToolCallBar } from './ToolCallBar';
import type { RequestDetailResponse } from '@fluxmaster/api-types';
import { useOrchestrationStore } from '@/stores/orchestration-store';

function DelegationChain({ requestStartedAt, totalDurationMs }: { requestStartedAt: number; totalDurationMs: number }) {
  const activities = useOrchestrationStore((s) => s.activities);

  const delegations = activities.filter(
    (a) =>
      (a.kind === 'delegation_completed' || a.kind === 'fanout_completed') &&
      a.timestamp.getTime() >= requestStartedAt &&
      a.timestamp.getTime() <= requestStartedAt + totalDurationMs + 1000,
  );

  if (delegations.length === 0) return null;

  return (
    <div className="space-y-1" data-testid="delegation-chain">
      <div className="text-xs text-gray-500 mb-2">Delegation Chain</div>
      {delegations.map((d) => (
        <div key={d.id} className="flex items-center gap-2 text-xs text-gray-400">
          <span className="text-blue-400">{d.sourceAgentId ?? 'coordinator'}</span>
          <span>\u2192</span>
          <span className="text-blue-400">{d.targetAgentId ?? d.targetAgentIds?.join(', ')}</span>
          {d.data?.durationMs != null && (
            <span className="text-gray-500">({formatDuration(d.data.durationMs as number)})</span>
          )}
          {d.data?.success === false && <span className="text-red-400">failed</span>}
        </div>
      ))}
    </div>
  );
}

interface RequestTimelineProps {
  request: RequestDetailResponse;
}

export function RequestTimeline({ request }: RequestTimelineProps) {
  const startedAt = new Date(request.startedAt).getTime();
  const totalDurationMs = request.totalDurationMs ?? 0;

  return (
    <div className="p-4 space-y-4" data-testid="request-timeline">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-200">
          {request.agentId}
          <span className="ml-2 text-xs text-gray-500">{formatDate(request.startedAt)}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          request.status === 'completed' ? 'bg-green-900 text-green-300' :
          request.status === 'error' ? 'bg-red-900 text-red-300' :
          request.status === 'streaming' ? 'bg-blue-900 text-blue-300' :
          'bg-yellow-900 text-yellow-300'
        }`}>
          {request.status}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-gray-500">TTFT</div>
          <div className="text-gray-200 font-mono">{formatDuration(request.ttftMs)}</div>
        </div>
        <div>
          <div className="text-gray-500">Total</div>
          <div className="text-gray-200 font-mono">{formatDuration(request.totalDurationMs)}</div>
        </div>
        <div>
          <div className="text-gray-500">Input</div>
          <div className="text-gray-200 font-mono">{request.inputTokens != null ? formatTokens(request.inputTokens) : '-'}</div>
        </div>
        <div>
          <div className="text-gray-500">Output</div>
          <div className="text-gray-200 font-mono">{request.outputTokens != null ? formatTokens(request.outputTokens) : '-'}</div>
        </div>
      </div>

      {/* Waterfall */}
      {totalDurationMs > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 mb-2">Timeline</div>

          {/* TTFT bar */}
          {request.ttftMs != null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-gray-400">First token</span>
              <div className="relative flex-1 h-4 bg-gray-800 rounded">
                <div
                  className="absolute h-full rounded bg-blue-500/70"
                  style={{ left: '0%', width: `${(request.ttftMs / totalDurationMs) * 100}%` }}
                />
              </div>
              <span className="w-14 text-right text-gray-400">{formatDuration(request.ttftMs)}</span>
            </div>
          )}

          {/* Tool calls */}
          {request.toolCalls.map((tc, i) => (
            <ToolCallBar
              key={`${tc.toolName}-${i}`}
              toolCall={tc}
              totalDurationMs={totalDurationMs}
              requestStartedAt={startedAt}
            />
          ))}
        </div>
      )}

      {/* Delegation chain */}
      <DelegationChain requestStartedAt={startedAt} totalDurationMs={totalDurationMs} />

      {/* Error message */}
      {request.errorMessage && (
        <div className="text-xs text-red-400 bg-red-900/20 rounded p-2">
          {request.errorMessage}
        </div>
      )}
    </div>
  );
}
