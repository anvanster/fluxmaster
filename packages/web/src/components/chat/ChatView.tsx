import { useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useDebugStore } from '@/stores/debug-store';
import { useAgents } from '@/api/hooks/useAgents';
import { useChat } from '@/api/hooks/useChat';
import { AgentSelector } from './AgentSelector';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ExportMenu } from './ExportMenu';
import { SuggestedFollowUps } from './SuggestedFollowUps';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { Button } from '@/components/common/Button';
import { Trash2, Bug } from 'lucide-react';

export function ChatView() {
  const { activeAgentId, conversations, streaming, suggestions, setActiveAgent, clearConversation, importConversation } = useChatStore();
  const debugPanelOpen = useDebugStore((s) => s.debugPanelOpen);
  const toggleDebugPanel = useDebugStore((s) => s.toggleDebugPanel);
  const { data: agents = [] } = useAgents();
  const { sendMessage } = useChat();

  // Auto-select first agent if current one doesn't exist
  useEffect(() => {
    if (agents.length > 0 && !agents.some((a) => a.id === activeAgentId)) {
      setActiveAgent(agents[0].id);
    }
  }, [agents, activeAgentId, setActiveAgent]);

  const messages = conversations.get(activeAgentId) ?? [];
  const isStreaming = Array.from(streaming.values()).some((s) => s.isStreaming);

  // Get suggestions for the most recent assistant message
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const currentSuggestions = lastAssistantMsg ? (suggestions.get(lastAssistantMsg.id) ?? []) : [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <AgentSelector agents={agents} activeId={activeAgentId} onSelect={setActiveAgent} />
        <div className="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDebugPanel}
            aria-label="Toggle debug panel"
            data-testid="debug-toggle"
          >
            <Bug size={14} />
          </Button>
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
      {!isStreaming && currentSuggestions.length > 0 && (
        <SuggestedFollowUps suggestions={currentSuggestions} onSelect={sendMessage} />
      )}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
      {debugPanelOpen && <DebugPanel />}
    </div>
  );
}
