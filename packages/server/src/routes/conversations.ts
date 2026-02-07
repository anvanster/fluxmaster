import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { validateBody } from '../middleware/validation.js';

const CreateConversationSchema = z.object({
  agentId: z.string().min(1),
});

const UpdateTitleSchema = z.object({
  title: z.string().min(1),
});

export function conversationRoutes(ctx: AppContext): FastifyPluginAsync {
  return async (fastify) => {
    // POST /api/conversations — create conversation
    fastify.post('/', async (request, reply) => {
      const validation = validateBody(CreateConversationSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error, issues: validation.issues });
      }
      const id = randomUUID();
      ctx.conversationStore.createConversation(id, validation.data.agentId);
      return reply.status(201).send({ id, agentId: validation.data.agentId });
    });

    // GET /api/conversations?agentId=X — list conversations
    fastify.get<{ Querystring: { agentId?: string } }>('/', async (request, reply) => {
      const agentId = request.query.agentId;
      if (!agentId) {
        return reply.status(400).send({ error: 'agentId query parameter is required' });
      }
      const conversations = ctx.conversationStore.listConversations(agentId);
      return { conversations };
    });

    // GET /api/conversations/:id — get conversation summary
    fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
      const conversation = ctx.conversationStore.getConversation(request.params.id);
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }
      return conversation;
    });

    // GET /api/conversations/:id/messages — get messages
    fastify.get<{ Params: { id: string } }>('/:id/messages', async (request, reply) => {
      const conversation = ctx.conversationStore.getConversation(request.params.id);
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }
      const messages = ctx.conversationStore.getMessages(request.params.id);
      return { messages };
    });

    // PUT /api/conversations/:id/title — update title
    fastify.put<{ Params: { id: string } }>('/:id/title', async (request, reply) => {
      const validation = validateBody(UpdateTitleSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error, issues: validation.issues });
      }
      const conversation = ctx.conversationStore.getConversation(request.params.id);
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }
      ctx.conversationStore.updateConversationTitle(request.params.id, validation.data.title);
      return { id: request.params.id, title: validation.data.title };
    });

    // DELETE /api/conversations/:id — delete conversation
    fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
      const conversation = ctx.conversationStore.getConversation(request.params.id);
      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }
      ctx.conversationStore.deleteConversation(request.params.id);
      return reply.status(204).send();
    });
  };
}
