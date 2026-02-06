import { useChatStore } from '@/stores/chat-store';
import { useAgents } from '@/api/hooks/useAgents';
import { useChat } from '@/api/hooks/useChat';
import { AgentSelector } from './AgentSelector';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

export function ChatView() {
  const { activeAgentId, conversations, streaming, setActiveAgent } = useChatStore();
  const { data: agents = [] } = useAgents();
  const { sendMessage } = useChat();

  const messages = conversations.get(activeAgentId) ?? [];
  const isStreaming = Array.from(streaming.values()).some((s) => s.isStreaming);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AgentSelector agents={agents} activeId={activeAgentId} onSelect={setActiveAgent} />
      <ChatMessageList messages={messages} streamingStates={streaming} />
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
