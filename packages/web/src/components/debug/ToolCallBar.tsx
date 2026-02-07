import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import type { ToolCallTimingResponse } from '@fluxmaster/api-types';

interface ToolCallBarProps {
  toolCall: ToolCallTimingResponse;
  totalDurationMs: number;
  requestStartedAt: number;
}

export function ToolCallBar({ toolCall, totalDurationMs, requestStartedAt }: ToolCallBarProps) {
  const startOffset = new Date(toolCall.startedAt).getTime() - requestStartedAt;
  const duration = toolCall.durationMs ?? 0;
  const leftPercent = totalDurationMs > 0 ? (startOffset / totalDurationMs) * 100 : 0;
  const widthPercent = totalDurationMs > 0 ? Math.max((duration / totalDurationMs) * 100, 1) : 100;

  return (
    <div className="flex items-center gap-2 text-xs" data-testid="tool-call-bar">
      <span className="w-24 truncate text-gray-400" title={toolCall.toolName}>
        {toolCall.toolName}
      </span>
      <div className="relative flex-1 h-4 bg-gray-800 rounded">
        <div
          className={cn(
            'absolute h-full rounded',
            toolCall.isError ? 'bg-red-500/70' : 'bg-orange-500/70',
          )}
          style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
        />
      </div>
      <span className="w-14 text-right text-gray-400">
        {formatDuration(toolCall.durationMs)}
      </span>
    </div>
  );
}
