import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chat-store';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      activeAgentId: 'default',
      conversations: new Map(),
      streaming: new Map(),
    });
  });

  it('starts with default agent', () => {
    expect(useChatStore.getState().activeAgentId).toBe('default');
  });

  it('sets active agent', () => {
    useChatStore.getState().setActiveAgent('researcher');
    expect(useChatStore.getState().activeAgentId).toBe('researcher');
  });

  it('adds user message to conversation', () => {
    useChatStore.getState().addUserMessage('default', 'msg-1', 'hello');
    const msgs = useChatStore.getState().conversations.get('default');
    expect(msgs).toHaveLength(1);
    expect(msgs![0].content).toBe('hello');
    expect(msgs![0].role).toBe('user');
  });

  it('starts and appends streaming text', () => {
    useChatStore.getState().startStream('req-1');
    useChatStore.getState().appendStreamDelta('req-1', 'Hello');
    useChatStore.getState().appendStreamDelta('req-1', ' world');

    const stream = useChatStore.getState().streaming.get('req-1');
    expect(stream?.text).toBe('Hello world');
    expect(stream?.isStreaming).toBe(true);
  });

  it('adds tool call to stream', () => {
    useChatStore.getState().startStream('req-1');
    useChatStore.getState().addStreamToolCall('req-1', 'read_file');

    const stream = useChatStore.getState().streaming.get('req-1');
    expect(stream?.toolCalls).toHaveLength(1);
    expect(stream?.toolCalls[0].name).toBe('read_file');
  });

  it('finalizes stream into conversation message', () => {
    useChatStore.getState().startStream('req-1');
    useChatStore.getState().appendStreamDelta('req-1', 'Hello');
    useChatStore.getState().addStreamToolCall('req-1', 'read_file');
    useChatStore.getState().finalizeStream('default', 'req-1', 'Hello');

    const msgs = useChatStore.getState().conversations.get('default');
    expect(msgs).toHaveLength(1);
    expect(msgs![0].role).toBe('assistant');
    expect(msgs![0].content).toBe('Hello');
    expect(msgs![0].toolCalls).toHaveLength(1);

    expect(useChatStore.getState().streaming.has('req-1')).toBe(false);
  });

  it('clears conversation', () => {
    useChatStore.getState().addUserMessage('default', 'msg-1', 'hello');
    useChatStore.getState().clearConversation('default');

    expect(useChatStore.getState().conversations.has('default')).toBe(false);
  });

  it('clears all conversations', () => {
    useChatStore.getState().addUserMessage('default', 'msg-1', 'hello');
    useChatStore.getState().addUserMessage('coder', 'msg-2', 'hi');
    useChatStore.getState().clearAllConversations();

    expect(useChatStore.getState().conversations.size).toBe(0);
  });

  it('updates tool result in stream', () => {
    useChatStore.getState().startStream('req-1');
    useChatStore.getState().addStreamToolCall('req-1', 'read_file');
    useChatStore.getState().updateStreamToolResult('req-1', 'read_file', 'file contents', false);

    const stream = useChatStore.getState().streaming.get('req-1');
    expect(stream?.toolCalls[0].status).toBe('done');
    expect(stream?.toolCalls[0].result).toBe('file contents');
  });
});
