import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '@fluxmaster/core';
import { AiFeatureService } from './ai-feature-service.js';

describe('AiFeatureService', () => {
  let eventBus: EventBus;
  let mockAgentManager: any;
  let mockConversationStore: any;
  let mockAiFeatureStore: any;
  let mockBroadcast: ReturnType<typeof vi.fn>;
  let service: AiFeatureService;

  beforeEach(() => {
    eventBus = new EventBus();
    mockAgentManager = {
      routeMessage: vi.fn().mockResolvedValue({
        text: 'Generated title',
        usage: { inputTokens: 50, outputTokens: 20 },
        iterations: 1,
        allContent: [],
      }),
      spawnAgent: vi.fn().mockResolvedValue({ config: { id: '_ai-features' } }),
      killAgent: vi.fn(),
      listAgents: vi.fn().mockReturnValue([]),
    };
    mockConversationStore = {
      getMessages: vi.fn().mockReturnValue([
        { id: 'm1', conversationId: 'conv-1', agentId: 'default', role: 'user', content: 'How do I write tests?', timestamp: new Date() },
      ]),
      updateConversationTitle: vi.fn(),
      getConversation: vi.fn().mockReturnValue({ id: 'conv-1', agentId: 'default', title: undefined }),
    };
    mockAiFeatureStore = {
      saveSuggestions: vi.fn(),
      getSuggestions: vi.fn().mockReturnValue([]),
      saveSummary: vi.fn(),
      getSummary: vi.fn().mockReturnValue(null),
    };
    mockBroadcast = vi.fn();

    service = new AiFeatureService({
      eventBus,
      agentManager: mockAgentManager,
      conversationStore: mockConversationStore,
      aiFeatureStore: mockAiFeatureStore,
      broadcast: mockBroadcast,
      config: { autoTitle: true, suggestedFollowUps: true, conversationSummary: false, model: 'gpt-4o-mini' },
    });
  });

  it('starts and stops subscriptions', () => {
    service.start();
    expect(eventBus.listenerCount('message:completed')).toBe(1);
    service.stop();
    expect(eventBus.listenerCount('message:completed')).toBe(0);
  });

  it('generates title on first message completion', async () => {
    mockAgentManager.routeMessage.mockResolvedValueOnce({
      text: 'Writing Tests Guide',
      usage: { inputTokens: 50, outputTokens: 10 },
      iterations: 1,
      allContent: [],
    });

    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: 'default',
      requestId: 'req-1',
      text: 'Here is how to write tests...',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    // Allow async processing
    await new Promise((r) => setTimeout(r, 50));

    expect(mockConversationStore.updateConversationTitle).toHaveBeenCalledWith(
      'conv-1',
      'Writing Tests Guide',
    );
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ai_feature', feature: 'title' }),
    );
  });

  it('skips title generation when conversation already has a title', async () => {
    mockConversationStore.getConversation.mockReturnValue({ id: 'conv-1', agentId: 'default', title: 'Existing Title' });

    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: 'default',
      requestId: 'req-1',
      text: 'Response',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockConversationStore.updateConversationTitle).not.toHaveBeenCalled();
  });

  it('generates follow-up suggestions', async () => {
    mockAgentManager.routeMessage
      .mockResolvedValueOnce({ text: 'Test Title', usage: { inputTokens: 50, outputTokens: 10 }, iterations: 1, allContent: [] })
      .mockResolvedValueOnce({ text: '["What are mocks?", "How to test async?", "Best practices?"]', usage: { inputTokens: 50, outputTokens: 20 }, iterations: 1, allContent: [] });

    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: 'default',
      requestId: 'req-1',
      text: 'Here is the answer',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(mockAiFeatureStore.saveSuggestions).toHaveBeenCalledWith(
      'req-1',
      'conv-1',
      ['What are mocks?', 'How to test async?', 'Best practices?'],
    );
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ai_feature', feature: 'suggestions' }),
    );
  });

  it('skips title generation when autoTitle is disabled', async () => {
    service.stop();
    service = new AiFeatureService({
      eventBus,
      agentManager: mockAgentManager,
      conversationStore: mockConversationStore,
      aiFeatureStore: mockAiFeatureStore,
      broadcast: mockBroadcast,
      config: { autoTitle: false, suggestedFollowUps: false, conversationSummary: false, model: 'gpt-4o-mini' },
    });

    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: 'default',
      requestId: 'req-1',
      text: 'Response',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockAgentManager.routeMessage).not.toHaveBeenCalled();
  });

  it('handles errors gracefully without crashing', async () => {
    mockAgentManager.routeMessage.mockRejectedValueOnce(new Error('LLM unavailable'));

    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: 'default',
      requestId: 'req-1',
      text: 'Response',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 50));

    // Should not throw or crash — errors are logged and swallowed
    expect(mockConversationStore.updateConversationTitle).not.toHaveBeenCalled();
  });

  it('does not process events from the AI features agent itself', async () => {
    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: '_ai-features',
      requestId: 'req-internal',
      text: 'Internal response',
      usage: { inputTokens: 50, outputTokens: 20 },
      iterations: 1,
      timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockAgentManager.routeMessage).not.toHaveBeenCalled();
  });

  it('handles malformed suggestions JSON gracefully', async () => {
    mockAgentManager.routeMessage
      .mockResolvedValueOnce({ text: 'Title', usage: { inputTokens: 50, outputTokens: 10 }, iterations: 1, allContent: [] })
      .mockResolvedValueOnce({ text: 'not valid json', usage: { inputTokens: 50, outputTokens: 20 }, iterations: 1, allContent: [] });

    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: 'default',
      requestId: 'req-1',
      text: 'Response',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 100));

    // Should not crash, suggestions not saved
    expect(mockAiFeatureStore.saveSuggestions).not.toHaveBeenCalled();
  });

  it('finds conversation from request store when not found in conversation messages', async () => {
    // Return no messages — can't find conversation
    mockConversationStore.getMessages.mockReturnValue([]);
    mockConversationStore.getConversation.mockReturnValue(undefined);

    service.start();
    eventBus.emit({
      type: 'message:completed',
      agentId: 'default',
      requestId: 'req-1',
      text: 'Response',
      usage: { inputTokens: 100, outputTokens: 50 },
      iterations: 1,
      timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 50));

    // No conversation found, nothing should happen
    expect(mockAgentManager.routeMessage).not.toHaveBeenCalled();
  });
});
