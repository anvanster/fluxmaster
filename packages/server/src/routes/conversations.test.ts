import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { EventBus } from '@fluxmaster/core';
import type { AppContext } from '../context.js';
import { UsageTracker } from '../usage-tracker.js';
import { CostCalculator } from '../cost-calculator.js';
import { errorHandler } from '../middleware/error-handler.js';
import { conversationRoutes } from './conversations.js';

function createMockContext(): AppContext {
  const usageTracker = new UsageTracker();
  return {
    config: {
      auth: { preferDirectApi: false },
      agents: { defaults: { maxTokens: 8192, temperature: 0.7 }, list: [] },
      mcpServers: { global: [] },
      retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
      plugins: [],
    } as any,
    authManager: {} as any,
    agentManager: {} as any,
    toolRegistry: {} as any,
    mcpServerManager: {} as any,
    usageTracker,
    eventBus: new EventBus(),
    costCalculator: new CostCalculator(usageTracker, {}, new Map()),
    databaseManager: { isOpen: true, close: vi.fn() } as any,
    conversationStore: {
      createConversation: vi.fn(),
      saveMessage: vi.fn(),
      getMessages: vi.fn().mockReturnValue([]),
      clearMessages: vi.fn(),
      listConversations: vi.fn().mockReturnValue([]),
      getConversation: vi.fn(),
      deleteConversation: vi.fn(),
      updateConversationTitle: vi.fn(),
    },
  };
}

async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(conversationRoutes(ctx), { prefix: '/api/conversations' });
  return app;
}

describe('Conversation Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createMockContext();
    app = await buildApp(ctx);
  });

  describe('POST /api/conversations', () => {
    it('creates a conversation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/conversations',
        payload: { agentId: 'agent-1' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.agentId).toBe('agent-1');
      expect(ctx.conversationStore.createConversation).toHaveBeenCalledWith(body.id, 'agent-1');
    });

    it('validates agentId is required', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/conversations',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/conversations', () => {
    it('lists conversations for an agent', async () => {
      const mockConversations = [
        { id: 'conv-1', agentId: 'agent-1', messageCount: 5, createdAt: new Date(), lastActiveAt: new Date() },
        { id: 'conv-2', agentId: 'agent-1', title: 'My Chat', messageCount: 3, createdAt: new Date(), lastActiveAt: new Date() },
      ];
      (ctx.conversationStore.listConversations as ReturnType<typeof vi.fn>).mockReturnValue(mockConversations);

      const res = await app.inject({
        method: 'GET',
        url: '/api/conversations?agentId=agent-1',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.conversations).toHaveLength(2);
      expect(ctx.conversationStore.listConversations).toHaveBeenCalledWith('agent-1');
    });

    it('requires agentId query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/conversations',
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('returns conversation summary', async () => {
      const mockConv = { id: 'conv-1', agentId: 'agent-1', title: 'My Chat', messageCount: 5, createdAt: new Date(), lastActiveAt: new Date() };
      (ctx.conversationStore.getConversation as ReturnType<typeof vi.fn>).mockReturnValue(mockConv);

      const res = await app.inject({
        method: 'GET',
        url: '/api/conversations/conv-1',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe('conv-1');
      expect(body.title).toBe('My Chat');
    });

    it('returns 404 for non-existent conversation', async () => {
      (ctx.conversationStore.getConversation as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const res = await app.inject({
        method: 'GET',
        url: '/api/conversations/nonexistent',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    it('returns messages for a conversation', async () => {
      const mockMessages = [
        { id: 'msg-1', conversationId: 'conv-1', agentId: 'agent-1', role: 'user', content: 'hello', timestamp: new Date() },
        { id: 'msg-2', conversationId: 'conv-1', agentId: 'agent-1', role: 'assistant', content: 'hi', timestamp: new Date() },
      ];
      (ctx.conversationStore.getConversation as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'conv-1' });
      (ctx.conversationStore.getMessages as ReturnType<typeof vi.fn>).mockReturnValue(mockMessages);

      const res = await app.inject({
        method: 'GET',
        url: '/api/conversations/conv-1/messages',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.messages).toHaveLength(2);
    });

    it('returns 404 for non-existent conversation', async () => {
      (ctx.conversationStore.getConversation as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const res = await app.inject({
        method: 'GET',
        url: '/api/conversations/nonexistent/messages',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/conversations/:id/title', () => {
    it('updates conversation title', async () => {
      (ctx.conversationStore.getConversation as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'conv-1' });

      const res = await app.inject({
        method: 'PUT',
        url: '/api/conversations/conv-1/title',
        payload: { title: 'New Title' },
      });

      expect(res.statusCode).toBe(200);
      expect(ctx.conversationStore.updateConversationTitle).toHaveBeenCalledWith('conv-1', 'New Title');
    });

    it('validates title is required', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/conversations/conv-1/title',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    it('deletes a conversation', async () => {
      (ctx.conversationStore.getConversation as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'conv-1' });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/conversations/conv-1',
      });

      expect(res.statusCode).toBe(204);
      expect(ctx.conversationStore.deleteConversation).toHaveBeenCalledWith('conv-1');
    });

    it('returns 404 for non-existent conversation', async () => {
      (ctx.conversationStore.getConversation as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/conversations/nonexistent',
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
