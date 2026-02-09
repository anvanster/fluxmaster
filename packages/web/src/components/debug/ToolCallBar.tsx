import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import type { ToolCallTimingResponse } from '@fluxmaster/api-types';

interface ToolCallBarProps {
  toolCall: ToolCallTimingResponse;
  totalDurationMs: number;
  requestStartedAt: number;
}

export function ToolCallBar({ toolCall, totalDurationMs, requestStartedAt }: ToolCallBarProps) {
  const [expanded, setExpanded] = useState(false);
  const startOffset = new Date(toolCall.startedAt).getTime() - requestStartedAt;
  const duration = toolCall.durationMs ?? 0;
  const leftPercent = totalDurationMs > 0 ? (startOffset / totalDurationMs) * 100 : 0;
  const widthPercent = totalDurationMs > 0 ? Math.max((duration / totalDurationMs) * 100, 1) : 100;

  const isDelegation = toolCall.toolName === 'delegate_to_agent' || toolCall.toolName === 'fan_out';

  return (
    <div data-testid="tool-call-bar">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-xs hover:bg-gray-800/50 rounded py-0.5"
        type="button"
      >
        <span className={cn('w-24 truncate text-left', isDelegation ? 'text-blue-400 font-medium' : 'text-gray-400')} title={toolCall.toolName}>
          {isDelegation ? '\u2192 ' : ''}{toolCall.toolName}
        </span>
        <div className="relative flex-1 h-4 bg-gray-800 rounded">
          <div
            className={cn(
              'absolute h-full rounded',
              toolCall.isError ? 'bg-red-500/70' : isDelegation ? 'bg-blue-500/70' : 'bg-orange-500/70',
            )}
            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
          />
        </div>
        <span className="w-14 text-right text-gray-400">
          {formatDuration(toolCall.durationMs)}
        </span>
      </button>
      {expanded && (
        <div className="ml-26 mt-0.5 mb-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 font-mono text-xs text-gray-400" data-testid="tool-call-bar-detail">
          <div>Started: {new Date(toolCall.startedAt).toLocaleTimeString()}</div>
          <div>Duration: {formatDuration(toolCall.durationMs)}</div>
          {toolCall.isError && <div className="text-red-400">Error</div>}
        </div>
      )}
    </div>
  );
}
