import { randomUUID } from 'node:crypto';
import type { EventBus, IEventStore, FluxmasterEvent } from '@fluxmaster/core';

export class EventPersister {
  private unsubscribers: Array<() => void> = [];

  constructor(
    private eventBus: EventBus,
    private eventStore: IEventStore,
  ) {}

  start(): void {
    const eventTypes: FluxmasterEvent['type'][] = [
      'agent:spawned',
      'agent:killed',
      'agent:status_changed',
      'message:started',
      'message:text_delta',
      'message:completed',
      'message:error',
      'tool:call_started',
      'tool:call_completed',
      'mcp:server_started',
      'mcp:server_stopped',
      'cost:updated',
    ];

    for (const type of eventTypes) {
      this.unsubscribers.push(
        this.eventBus.on(type, (event) => {
          try {
            this.eventStore.saveEvent({
              id: randomUUID(),
              type: event.type,
              agentId: 'agentId' in event ? (event as { agentId: string }).agentId : undefined,
              requestId: 'requestId' in event ? (event as { requestId: string }).requestId : undefined,
              payload: JSON.stringify(event),
              timestamp: event.timestamp,
            });
          } catch {
            // Persistence errors should not crash the event bus
          }
        }),
      );
    }
  }

  stop(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }
}
