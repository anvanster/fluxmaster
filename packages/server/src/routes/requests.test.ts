import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { EventBus, type IRequestStore, type RequestRecord } from '@fluxmaster/core';
import type { AppContext } from '../context.js';
import { UsageTracker } from '../usage-tracker.js';
import { CostCalculator } from '../cost-calculator.js';
import { errorHandler } from '../middleware/error-handler.js';
import { requestRoutes } from './requests.js';

function createMockRequestStore(): IRequestStore {
  return {
    saveRequest: vi.fn(),
    updateRequest: vi.fn(),
    getRequest: vi.fn(),
    listRequests: vi.fn().mockReturnValue([]),
  };
}

function createMockContext(requestStore: IRequestStore): AppContext {
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
    conversationStore: {} as any,
    requestStore,
  } as any;
}

async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(requestRoutes(ctx), { prefix: '/api/requests' });
  return app;
}

describe('Request Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;
  let requestStore: IRequestStore;

  beforeEach(async () => {
    requestStore = createMockRequestStore();
    ctx = createMockContext(requestStore);
    app = await buildApp(ctx);
  });

  describe('GET /api/requests/:requestId', () => {
    it('returns request detail with timing', async () => {
      const mockReq: RequestRecord = {
        id: 'r1',
        agentId: 'a1',
        conversationId: 'conv-1',
        status: 'completed',
        startedAt: new Date('2024-01-01T00:00:00Z'),
        firstTokenAt: new Date('2024-01-01T00:00:01Z'),
        completedAt: new Date('2024-01-01T00:00:05Z'),
        inputTokens: 100,
        outputTokens: 200,
        iterations: 2,
        toolCalls: [
          { toolName: 'read_file', startedAt: new Date('2024-01-01T00:00:02Z'), completedAt: new Date('2024-01-01T00:00:03Z'), durationMs: 1000, isError: false },
        ],
      };
      (requestStore.getRequest as ReturnType<typeof vi.fn>).mockReturnValue(mockReq);

      const res = await app.inject({
        method: 'GET',
        url: '/api/requests/r1',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe('r1');
      expect(body.status).toBe('completed');
      expect(body.ttftMs).toBe(1000);
      expect(body.totalDurationMs).toBe(5000);
      expect(body.toolCalls).toHaveLength(1);
    });

    it('returns 404 for non-existent request', async () => {
      (requestStore.getRequest as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const res = await app.inject({
        method: 'GET',
        url: '/api/requests/nonexistent',
      });

      expect(res.statusCode).toBe(404);
    });

    it('handles null firstTokenAt/completedAt gracefully', async () => {
      const mockReq: RequestRecord = {
        id: 'r1',
        agentId: 'a1',
        conversationId: 'conv-1',
        status: 'pending',
        startedAt: new Date('2024-01-01T00:00:00Z'),
        toolCalls: [],
      };
      (requestStore.getRequest as ReturnType<typeof vi.fn>).mockReturnValue(mockReq);

      const res = await app.inject({
        method: 'GET',
        url: '/api/requests/r1',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.ttftMs).toBeNull();
      expect(body.totalDurationMs).toBeNull();
    });
  });

  describe('GET /api/requests', () => {
    it('lists requests for an agent', async () => {
      const mockRequests: RequestRecord[] = [
        { id: 'r1', agentId: 'a1', conversationId: 'conv-1', status: 'completed', startedAt: new Date(), toolCalls: [] },
        { id: 'r2', agentId: 'a1', conversationId: 'conv-1', status: 'completed', startedAt: new Date(), toolCalls: [] },
      ];
      (requestStore.listRequests as ReturnType<typeof vi.fn>).mockReturnValue(mockRequests);

      const res = await app.inject({
        method: 'GET',
        url: '/api/requests?agentId=a1',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.requests).toHaveLength(2);
      expect(requestStore.listRequests).toHaveBeenCalledWith('a1', { limit: 50, offset: 0 });
    });

    it('requires agentId query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requests',
      });

      expect(res.statusCode).toBe(400);
    });

    it('supports limit and offset params', async () => {
      (requestStore.listRequests as ReturnType<typeof vi.fn>).mockReturnValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/requests?agentId=a1&limit=10&offset=5',
      });

      expect(requestStore.listRequests).toHaveBeenCalledWith('a1', { limit: 10, offset: 5 });
    });
  });
});
