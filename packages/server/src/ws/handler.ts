import type { WebSocket } from '@fastify/websocket';
import type { AppContext } from '../context.js';
import type { WsClientMessage, WsServerMessage } from '../shared/ws-types.js';
import { ConnectionManager } from './connection-manager.js';
import { meterUsage } from '../cost-metering.js';

const SENSITIVE_KEYS = /password|token|key|secret|credential|auth/i;
const MAX_ARG_VALUE_LENGTH = 200;

function sanitizeToolArgs(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > MAX_ARG_VALUE_LENGTH) {
      result[key] = value.slice(0, MAX_ARG_VALUE_LENGTH) + '...';
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class WsHandler {
  private ctx: AppContext;
  readonly connections: ConnectionManager;

  constructor(ctx: AppContext) {
    this.ctx = ctx;
    this.connections = new ConnectionManager();
  }

  handleConnection(socket: WebSocket, connectionId: string): void {
    this.connections.add(connectionId, socket);

    socket.on('message', async (raw: Buffer | string) => {
      try {
        const msg: WsClientMessage = JSON.parse(raw.toString());
        await this.dispatch(socket, msg);
      } catch (err) {
        const errorMsg: WsServerMessage = {
          type: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        socket.send(JSON.stringify(errorMsg));
      }
    });

    socket.on('close', () => {
      this.connections.remove(connectionId);
    });
  }

  private async dispatch(socket: WebSocket, msg: WsClientMessage): Promise<void> {
    switch (msg.type) {
      case 'ping': {
        const pong: WsServerMessage = { type: 'pong' };
        socket.send(JSON.stringify(pong));
        break;
      }
      case 'message': {
        await this.handleMessage(socket, msg);
        break;
      }
    }
  }

  private async handleMessage(
    socket: WebSocket,
    msg: Extract<WsClientMessage, { type: 'message' }>,
  ): Promise<void> {
    const { agentId, text, requestId } = msg;
    const eventBus = this.ctx.eventBus;

    // Budget check
    const budgetCheck = this.ctx.budgetManager.checkBudget(agentId);
    if (!budgetCheck.allowed) {
      const errorMsg: WsServerMessage = {
        type: 'error',
        error: budgetCheck.reason ?? 'Budget exceeded',
        requestId,
      };
      socket.send(JSON.stringify(errorMsg));
      return;
    }

    eventBus.emit({ type: 'message:started', agentId, requestId, timestamp: new Date() });

    try {
      const toolInputs = new Map<string, unknown>();

      const result = await this.ctx.agentManager.routeMessageStream(
        agentId,
        text,
        (event) => {
          if (event.type === 'text_delta' && event.text) {
            const delta: WsServerMessage = { type: 'text_delta', text: event.text, requestId };
            socket.send(JSON.stringify(delta));
            eventBus.emit({ type: 'message:text_delta', agentId, requestId, text: event.text, timestamp: new Date() });
          } else if (event.type === 'tool_use_start' && event.toolUse) {
            const sanitizedArgs = sanitizeToolArgs(event.toolUse.input);
            const toolStart: WsServerMessage = { type: 'tool_use_start', toolName: event.toolUse.name, requestId, args: sanitizedArgs };
            socket.send(JSON.stringify(toolStart));
            eventBus.emit({ type: 'tool:call_started', agentId, requestId, toolName: event.toolUse.name, timestamp: new Date() });
          } else if (event.type === 'tool_use_end' && event.toolUse) {
            toolInputs.set(event.toolUse.name, event.toolUse.input);
          }
        },
      );

      // Send tool results from the completed content blocks
      for (const block of result.allContent) {
        if (block.type === 'tool_result') {
          const toolUseBlock = result.allContent.find(
            (b) => b.type === 'tool_use' && b.id === block.toolUseId,
          );
          const toolName = toolUseBlock && 'name' in toolUseBlock ? toolUseBlock.name : 'unknown';
          const toolResult: WsServerMessage = {
            type: 'tool_result',
            toolName,
            content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
            isError: block.isError ?? false,
            requestId,
          };
          socket.send(JSON.stringify(toolResult));
          eventBus.emit({ type: 'tool:call_completed', agentId, requestId, toolName, result: typeof block.content === 'string' ? block.content : JSON.stringify(block.content), isError: block.isError ?? false, timestamp: new Date() });
        }
      }

      this.ctx.usageTracker.record(agentId, result.usage.inputTokens, result.usage.outputTokens);

      // Emit cost event for budget tracking
      const provider = this.ctx.agentProviders.get(agentId) ?? 'copilot';
      const model = this.ctx.agentModels.get(agentId) ?? '';
      const metered = meterUsage(provider, model, result.usage.inputTokens, result.usage.outputTokens, this.ctx.costCalculator);
      eventBus.emit({
        type: 'cost:updated',
        agentId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cost: metered.amount,
        unit: metered.unit,
        provider,
        timestamp: new Date(),
      });

      const complete: WsServerMessage = {
        type: 'message_complete',
        text: result.text,
        usage: result.usage,
        iterations: result.iterations,
        allContent: result.allContent,
        requestId,
      };
      socket.send(JSON.stringify(complete));
      eventBus.emit({ type: 'message:completed', agentId, requestId, text: result.text, usage: result.usage, iterations: result.iterations, timestamp: new Date() });
    } catch (err) {
      const errorMsg: WsServerMessage = {
        type: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        requestId,
      };
      socket.send(JSON.stringify(errorMsg));
      eventBus.emit({ type: 'message:error', agentId, requestId, error: err instanceof Error ? err.message : 'Unknown error', timestamp: new Date() });
    }
  }

  shutdown(): void {
    this.connections.closeAll();
  }
}
