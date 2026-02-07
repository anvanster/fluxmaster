import type { FluxmasterEventType, EventOfType } from './event-types.js';

export type EventHandler<T extends FluxmasterEventType> = (event: EventOfType<T>) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (event: any) => void;

export class EventBus {
  private listeners: Map<string, Set<AnyHandler>> = new Map();

  emit<T extends FluxmasterEventType>(event: EventOfType<T>): void {
    const handlers = this.listeners.get(event.type);
    if (!handlers || handlers.size === 0) return;

    // Iterate over a snapshot to handle concurrent unsubscribe
    for (const handler of [...handlers]) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to prevent one bad subscriber from breaking others
      }
    }
  }

  on<T extends FluxmasterEventType>(type: T, handler: EventHandler<T>): () => void {
    let handlers = this.listeners.get(type);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(type, handlers);
    }
    handlers.add(handler as AnyHandler);

    return () => {
      handlers!.delete(handler as AnyHandler);
    };
  }

  once<T extends FluxmasterEventType>(type: T, handler: EventHandler<T>): () => void {
    const wrappedHandler: EventHandler<T> = (event) => {
      unsub();
      handler(event);
    };
    const unsub = this.on(type, wrappedHandler);
    return unsub;
  }

  removeAllListeners(type?: FluxmasterEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(type: FluxmasterEventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}
