import { useCallback, useEffect, useRef } from 'react';
import { WsClient } from '@/api/ws-client';
import { useChatStore } from '@/stores/chat-store';
import { useOrchestrationStore } from '@/stores/orchestration-store';
import type { WsServerMessage } from '@fluxmaster/api-types';

let wsClient: WsClient | null = null;

export function useChat() {
  const { activeAgentId, addUserMessage, startStream, appendStreamDelta, addStreamToolCall, updateStreamToolResult, finalizeStream, setSuggestions } = useChatStore();
  const { addActivity, startDelegation, completeDelegation } = useOrchestrationStore();
  const requestCounter = useRef(0);

  useEffect(() => {
    if (!wsClient) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsClient = new WsClient(`${protocol}//${window.location.host}/ws`);
      wsClient.connect();
    }

    const unsubscribe = wsClient.onMessage((msg: WsServerMessage) => {
      switch (msg.type) {
        case 'text_delta':
          appendStreamDelta(msg.requestId, msg.text);
          break;
        case 'tool_use_start':
          addStreamToolCall(msg.requestId, msg.toolName, msg.args);
          break;
        case 'tool_result':
          updateStreamToolResult(msg.requestId, msg.toolName, msg.content, msg.isError);
          break;
        case 'message_complete':
          finalizeStream(activeAgentId, msg.requestId, msg.text);
          break;
        case 'error':
          if (msg.requestId) {
            finalizeStream(activeAgentId, msg.requestId, `Error: ${msg.error}`);
          }
          break;
        case 'ai_feature':
          if (msg.feature === 'suggestions' && msg.requestId) {
            const data = msg.data as { suggestions?: string[] };
            if (data?.suggestions) {
              setSuggestions(msg.requestId, data.suggestions);
            }
          }
          break;
        case 'orchestration_event': {
          const activityId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          addActivity({
            id: activityId,
            kind: msg.event,
            sourceAgentId: msg.sourceAgentId,
            targetAgentId: msg.targetAgentId,
            targetAgentIds: msg.targetAgentIds,
            data: msg.data,
            timestamp: new Date(msg.timestamp),
          });
          if (msg.event === 'delegation_started' && msg.sourceAgentId && msg.targetAgentId) {
            startDelegation({
              requestId: msg.data?.requestId as string ?? activityId,
              sourceAgentId: msg.sourceAgentId,
              targetAgentId: msg.targetAgentId,
              message: (msg.data?.message as string) ?? '',
              startedAt: new Date(msg.timestamp),
            });
          } else if (msg.event === 'delegation_completed') {
            completeDelegation(msg.data?.requestId as string ?? '');
          }
          break;
        }
        case 'agent_event':
          addActivity({
            id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            kind: 'agent_status',
            targetAgentId: msg.agentId,
            data: { event: msg.event, ...msg.data },
            timestamp: new Date(),
          });
          break;
      }
    });

    return unsubscribe;
  }, [activeAgentId, appendStreamDelta, addStreamToolCall, finalizeStream, setSuggestions, addActivity, startDelegation, completeDelegation]);

  const sendMessage = useCallback(
    (text: string) => {
      const requestId = `req-${Date.now()}-${requestCounter.current++}`;
      addUserMessage(activeAgentId, `msg-${requestId}`, text);
      startStream(requestId);
      wsClient?.send({ type: 'message', agentId: activeAgentId, text, requestId });
    },
    [activeAgentId, addUserMessage, startStream],
  );

  return {
    sendMessage,
    isConnected: wsClient?.isConnected ?? false,
  };
}
