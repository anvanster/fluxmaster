import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { validateBody } from '../middleware/validation.js';
import { meterUsage } from '../cost-metering.js';
import type { AgentInfoResponse, MessageResponse, HistoryResponse } from '../shared/api-types.js';

const SpawnAgentSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).default([]),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const SendMessageSchema = z.object({
  message: z.string().min(1),
});

export function agentRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // POST /api/agents — spawn agent
    fastify.post('/', async (request, reply) => {
      const validation = validateBody(SpawnAgentSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error, issues: validation.issues });
      }
      const worker = await ctx.agentManager.spawnAgent({
        ...validation.data,
        tools: validation.data.tools ?? [],
      });
      const info: AgentInfoResponse = {
        id: worker.config.id,
        model: worker.config.model,
        status: worker.status,
        tools: worker.config.tools,
        systemPrompt: worker.config.systemPrompt,
        temperature: worker.config.temperature,
        maxTokens: worker.config.maxTokens,
      };
      return reply.status(201).send(info);
    });

    // GET /api/agents — list agents
    fastify.get('/', async () => {
      const agents: AgentInfoResponse[] = ctx.agentManager.listAgents();
      return agents;
    });

    // DELETE /api/agents/:id — kill agent
    fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
      ctx.agentManager.killAgent(request.params.id);
      return reply.status(204).send();
    });

    // POST /api/agents/:id/message — send message
    fastify.post<{ Params: { id: string } }>('/:id/message', async (request, reply) => {
      const validation = validateBody(SendMessageSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error, issues: validation.issues });
      }
      // Budget check
      const budgetCheck = ctx.budgetManager.checkBudget(request.params.id);
      if (!budgetCheck.allowed) {
        return reply.status(429).send({ error: 'Budget exceeded', reason: budgetCheck.reason });
      }
      const result = await ctx.agentManager.routeMessage(request.params.id, validation.data.message);
      ctx.usageTracker.record(request.params.id, result.usage.inputTokens, result.usage.outputTokens);

      // Emit cost event for budget tracking
      const provider = ctx.agentProviders.get(request.params.id) ?? 'copilot';
      const model = ctx.agentModels.get(request.params.id) ?? '';
      const metered = meterUsage(provider, model, result.usage.inputTokens, result.usage.outputTokens, ctx.costCalculator);
      ctx.eventBus.emit({
        type: 'cost:updated',
        agentId: request.params.id,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cost: metered.amount,
        unit: metered.unit,
        provider,
        timestamp: new Date(),
      });

      const response: MessageResponse = {
        text: result.text,
        usage: result.usage,
        iterations: result.iterations,
        allContent: result.allContent,
      };
      return response;
    });

    // GET /api/agents/:id/history — get conversation history
    fastify.get<{ Params: { id: string } }>('/:id/history', async (request) => {
      const worker = ctx.agentManager.getAgent(request.params.id);
      if (!worker) {
        return { messages: [] };
      }
      const response: HistoryResponse = { messages: worker.getHistory() };
      return response;
    });

    // DELETE /api/agents/:id/history — clear history
    fastify.delete<{ Params: { id: string } }>('/:id/history', async (request, reply) => {
      const worker = ctx.agentManager.getAgent(request.params.id);
      if (!worker) {
        return reply.status(404).send({ error: 'Agent not found' });
      }
      worker.clearHistory();
      return reply.status(204).send();
    });
  };
}
