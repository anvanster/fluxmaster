import type { WebSocket } from '@fastify/websocket';

export class ConnectionManager {
  private connections: Map<string, WebSocket> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  add(id: string, socket: WebSocket): void {
    this.connections.set(id, socket);
  }

  remove(id: string): void {
    this.connections.delete(id);
  }

  get(id: string): WebSocket | undefined {
    return this.connections.get(id);
  }

  getAll(): Map<string, WebSocket> {
    return this.connections;
  }

  count(): number {
    return this.connections.size;
  }

  broadcast(message: string): void {
    for (const socket of this.connections.values()) {
      if (socket.readyState === 1) { // OPEN
        socket.send(message);
      }
    }
  }

  startHeartbeat(intervalMs: number = 30_000): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [id, socket] of this.connections) {
        if (socket.readyState !== 1) {
          this.connections.delete(id);
          continue;
        }
        socket.ping();
      }
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  closeAll(): void {
    this.stopHeartbeat();
    for (const socket of this.connections.values()) {
      socket.close();
    }
    this.connections.clear();
  }
}
