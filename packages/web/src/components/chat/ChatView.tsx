import { useChatStore } from '@/stores/chat-store';
import { useAgents } from '@/api/hooks/useAgents';
import { useChat } from '@/api/hooks/useChat';
import { AgentSelector } from './AgentSelector';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ExportMenu } from './ExportMenu';
import { Button } from '@/components/common/Button';
import { Trash2 } from 'lucide-react';

export function ChatView() {
  const { activeAgentId, conversations, streaming, setActiveAgent, clearConversation, importConversation } = useChatStore();
  const { data: agents = [] } = useAgents();
  const { sendMessage } = useChat();

  const messages = conversations.get(activeAgentId) ?? [];
  const isStreaming = Array.from(streaming.values()).some((s) => s.isStreaming);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <AgentSelector agents={agents} activeId={activeAgentId} onSelect={setActiveAgent} />
        <div className="flex items-center gap-1 mr-2">
          <ExportMenu agentId={activeAgentId} messages={messages} onImport={importConversation} />
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearConversation(activeAgentId)}
              aria-label="Clear conversation"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
      <ChatMessageList messages={messages} streamingStates={streaming} />
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
