import { useCallback, useEffect, useRef } from 'react';
import { WsClient } from '@/api/ws-client';
import { useChatStore } from '@/stores/chat-store';
import type { WsServerMessage } from '@fluxmaster/api-types';

let wsClient: WsClient | null = null;

export function useChat() {
  const { activeAgentId, addUserMessage, startStream, appendStreamDelta, addStreamToolCall, finalizeStream } = useChatStore();
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
          addStreamToolCall(msg.requestId, msg.toolName);
          break;
        case 'message_complete':
          finalizeStream(activeAgentId, msg.requestId, msg.text);
          break;
      }
    });

    return unsubscribe;
  }, [activeAgentId, appendStreamDelta, addStreamToolCall, finalizeStream]);

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
