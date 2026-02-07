import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/stores/chat-store';
import { ToolCallIndicator } from './ToolCallIndicator';
import { MarkdownContent } from './MarkdownContent';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'justify-end' : 'justify-start')} data-testid="chat-message">
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2 text-sm',
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100',
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose-sm prose-invert max-w-none" data-testid="markdown-content">
            <MarkdownContent content={message.content} />
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallIndicator key={i} name={tc.name} status={tc.status} result={tc.result} isError={tc.isError} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
