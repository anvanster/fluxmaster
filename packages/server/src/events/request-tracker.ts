import type { EventBus, IRequestStore, ToolCallTiming } from '@fluxmaster/core';

export class RequestTracker {
  private unsubscribers: (() => void)[] = [];
  private firstTokenSeen: Set<string> = new Set();
  private pendingToolCalls: Map<string, ToolCallTiming[]> = new Map();

  constructor(
    private eventBus: EventBus,
    private requestStore: IRequestStore,
  ) {}

  start(): void {
    this.unsubscribers.push(
      this.eventBus.on('message:started', (event) => {
        try {
          this.requestStore.saveRequest({
            id: event.requestId,
            agentId: event.agentId,
            conversationId: null,
            status: 'pending',
            startedAt: event.timestamp,
            toolCalls: [],
          });
        } catch {
          // Store errors are non-fatal
        }
      }),
    );

    this.unsubscribers.push(
      this.eventBus.on('message:text_delta', (event) => {
        if (this.firstTokenSeen.has(event.requestId)) return;
        this.firstTokenSeen.add(event.requestId);
        try {
          this.requestStore.updateRequest(event.requestId, {
            status: 'streaming',
            firstTokenAt: event.timestamp,
          });
        } catch {
          // Store errors are non-fatal
        }
      }),
    );

    this.unsubscribers.push(
      this.eventBus.on('tool:call_started', (event) => {
        const calls = this.pendingToolCalls.get(event.requestId) ?? [];
        calls.push({
          toolName: event.toolName,
          startedAt: event.timestamp,
          isError: false,
        });
        this.pendingToolCalls.set(event.requestId, calls);
      }),
    );

    this.unsubscribers.push(
      this.eventBus.on('tool:call_completed', (event) => {
        const calls = this.pendingToolCalls.get(event.requestId);
        if (!calls) return;
        const call = calls.find((c) => c.toolName === event.toolName && !c.completedAt);
        if (call) {
          call.completedAt = event.timestamp;
          call.durationMs = event.timestamp.getTime() - call.startedAt.getTime();
          call.isError = event.isError;
        }
        try {
          this.requestStore.updateRequest(event.requestId, { toolCalls: calls });
        } catch {
          // Store errors are non-fatal
        }
      }),
    );

    this.unsubscribers.push(
      this.eventBus.on('message:completed', (event) => {
        try {
          this.requestStore.updateRequest(event.requestId, {
            status: 'completed',
            completedAt: event.timestamp,
            inputTokens: event.usage.inputTokens,
            outputTokens: event.usage.outputTokens,
            iterations: event.iterations,
          });
        } catch {
          // Store errors are non-fatal
        }
        this.cleanup(event.requestId);
      }),
    );

    this.unsubscribers.push(
      this.eventBus.on('message:error', (event) => {
        try {
          this.requestStore.updateRequest(event.requestId, {
            status: 'error',
            completedAt: event.timestamp,
            errorMessage: event.error,
          });
        } catch {
          // Store errors are non-fatal
        }
        this.cleanup(event.requestId);
      }),
    );
  }

  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.firstTokenSeen.clear();
    this.pendingToolCalls.clear();
  }

  private cleanup(requestId: string): void {
    this.firstTokenSeen.delete(requestId);
    this.pendingToolCalls.delete(requestId);
  }
}
