import type { WebSocket } from '@fastify/websocket';
import type { AppContext } from '../context.js';
import type { WsClientMessage, WsServerMessage } from '../shared/ws-types.js';
import { ConnectionManager } from './connection-manager.js';

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

    try {
      const toolInputs = new Map<string, unknown>();

      const result = await this.ctx.agentManager.routeMessageStream(
        agentId,
        text,
        (event) => {
          if (event.type === 'text_delta' && event.text) {
            const delta: WsServerMessage = { type: 'text_delta', text: event.text, requestId };
            socket.send(JSON.stringify(delta));
          } else if (event.type === 'tool_use_start' && event.toolUse) {
            const toolStart: WsServerMessage = { type: 'tool_use_start', toolName: event.toolUse.name, requestId };
            socket.send(JSON.stringify(toolStart));
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
        }
      }

      this.ctx.usageTracker.record(agentId, result.usage.inputTokens, result.usage.outputTokens);

      const complete: WsServerMessage = {
        type: 'message_complete',
        text: result.text,
        usage: result.usage,
        iterations: result.iterations,
        allContent: result.allContent,
        requestId,
      };
      socket.send(JSON.stringify(complete));
    } catch (err) {
      const errorMsg: WsServerMessage = {
        type: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        requestId,
      };
      socket.send(JSON.stringify(errorMsg));
    }
  }

  shutdown(): void {
    this.connections.closeAll();
  }
}
