import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import type { RequestDetailResponse } from '@fluxmaster/api-types';

interface RequestListItemProps {
  request: RequestDetailResponse;
  isSelected: boolean;
  onClick: () => void;
}

const statusColors: Record<RequestDetailResponse['status'], string> = {
  pending: 'bg-yellow-500',
  streaming: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  error: 'bg-red-500',
};

export function RequestListItem({ request, isSelected, onClick }: RequestListItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-800 transition-colors',
        isSelected && 'bg-gray-800 border-l-2 border-blue-500',
      )}
      onClick={onClick}
      data-testid="request-list-item"
    >
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[request.status])} />
      <span className="flex-1 truncate text-gray-300">{request.agentId}</span>
      <span className="text-gray-500" title="TTFT">
        {formatDuration(request.ttftMs)}
      </span>
      <span className="text-gray-500" title="Total">
        {formatDuration(request.totalDurationMs)}
      </span>
      <span className="text-gray-500">
        {request.inputTokens != null ? `${request.inputTokens + (request.outputTokens ?? 0)}t` : '-'}
      </span>
    </button>
  );
}
