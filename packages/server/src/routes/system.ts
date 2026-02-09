import type { FastifyPluginAsync } from 'fastify';
import { listCopilotModels, inferProvider, getCopilotMultiplier } from '@fluxmaster/auth';
import type { AppContext } from '../context.js';
import type { HealthResponse, UsageResponse, CostResponse, ModelInfo } from '../shared/api-types.js';
import { AGENT_PRESETS, listPresets } from '../presets/index.js';
import { WORKFLOW_TEMPLATES, listWorkflowTemplates } from '../presets/index.js';

const startTime = Date.now();

export function systemRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/health
    fastify.get('/health', async () => {
      const response: HealthResponse = {
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };
      return response;
    });

    // GET /api/usage
    fastify.get('/usage', async () => {
      const response: UsageResponse = {
        total: ctx.usageTracker.getTotal(),
        byAgent: ctx.usageTracker.getAll(),
      };
      return response;
    });

    // GET /api/models
    fastify.get('/models', async () => {
      const models: ModelInfo[] = listCopilotModels().map((id) => ({
        id,
        provider: inferProvider(id) as string,
        premiumMultiplier: getCopilotMultiplier(id),
      }));
      return models;
    });

    // GET /api/cost
    fastify.get('/cost', async () => {
      const response: CostResponse = {
        totalCost: ctx.costCalculator.getTotalCost(),
        totalPremiumRequests: ctx.costCalculator.getTotalPremiumRequests(ctx.agentProviders),
        byAgent: ctx.costCalculator.getProviderAwareBreakdown(ctx.agentProviders),
      };
      return response;
    });

    // GET /api/presets — list agent role presets
    fastify.get('/presets', async () => {
      return listPresets().map((role) => ({
        role,
        ...AGENT_PRESETS[role],
      }));
    });

    // GET /api/workflow-templates — list workflow templates
    fastify.get('/workflow-templates', async () => {
      return listWorkflowTemplates().map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        inputs: t.inputs,
        stepCount: t.steps.length,
      }));
    });
  };
}
