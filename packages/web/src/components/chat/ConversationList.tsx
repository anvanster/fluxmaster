import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { ConversationSummaryResponse } from '@fluxmaster/api-types';

interface ConversationListProps {
  conversations: ConversationSummaryResponse[];
  selectedId?: string;
  onSelect: (conversationId: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-500 text-center">No conversations yet</div>
    );
  }

  return (
    <div className="overflow-y-auto" data-testid="conversation-list">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          className={cn(
            'w-full flex flex-col px-3 py-2 text-left hover:bg-gray-800 transition-colors border-b border-gray-800',
            selectedId === conv.id && 'bg-gray-800',
          )}
          onClick={() => onSelect(conv.id)}
        >
          <span className="text-sm text-gray-200 truncate">
            {conv.title || 'Untitled'}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{conv.messageCount} msgs</span>
            <span>{formatDate(conv.lastActiveAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
