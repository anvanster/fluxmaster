import { useEffect, useRef } from 'react';
import type { ChatMessage as ChatMessageType, StreamingState } from '@/stores/chat-store';
import { ChatMessage } from './ChatMessage';
import { StreamingText } from './StreamingText';
import { EmptyState } from '@/components/common/EmptyState';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  streamingStates: Map<string, StreamingState>;
}

export function ChatMessageList({ messages, streamingStates }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingStates.size]);

  const activeStreams = Array.from(streamingStates.entries()).filter(
    ([, s]) => s.isStreaming,
  );

  if (messages.length === 0 && activeStreams.length === 0) {
    return <EmptyState title="No messages yet" description="Send a message to start a conversation" />;
  }

  return (
    <div className="flex-1 overflow-y-auto" data-testid="chat-message-list">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {activeStreams.map(([requestId, stream]) => (
        <StreamingText key={requestId} text={stream.text} toolCalls={stream.toolCalls} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
