import type { EventBus, FluxmasterEventType } from '@fluxmaster/core';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { WsServerMessage } from '../shared/ws-types.js';

export class WsEventBridge {
  private eventBus: EventBus;
  private connections: ConnectionManager;
  private unsubscribers: Array<() => void> = [];

  constructor(eventBus: EventBus, connections: ConnectionManager) {
    this.eventBus = eventBus;
    this.connections = connections;
  }

  start(): void {
    this.unsubscribers.push(
      this.eventBus.on('agent:spawned', (event) => {
        this.broadcast({ type: 'agent_event', event: 'spawned', agentId: event.agentId, data: { model: event.model } });
      }),
      this.eventBus.on('agent:killed', (event) => {
        this.broadcast({ type: 'agent_event', event: 'killed', agentId: event.agentId });
      }),
      this.eventBus.on('agent:status_changed', (event) => {
        this.broadcast({ type: 'agent_event', event: 'status_changed', agentId: event.agentId, data: { status: event.status, previousStatus: event.previousStatus } });
      }),
      this.eventBus.on('message:completed', (event) => {
        this.broadcast({ type: 'agent_event', event: 'message_completed' as 'spawned', agentId: event.agentId, data: { requestId: event.requestId, usage: event.usage } });
      }),
      this.eventBus.on('cost:updated', (event) => {
        this.broadcast({ type: 'cost_update', agentId: event.agentId, cost: event.cost, unit: event.unit, inputTokens: event.inputTokens, outputTokens: event.outputTokens });
      }),
      this.eventBus.on('budget:warning', (event) => {
        this.broadcast({ type: 'budget_event', event: 'warning', budgetId: event.budgetId, currentCost: event.currentCost, maxCost: event.maxCost, threshold: event.threshold });
      }),
      this.eventBus.on('budget:exceeded', (event) => {
        this.broadcast({ type: 'budget_event', event: 'exceeded', budgetId: event.budgetId, currentCost: event.currentCost, maxCost: event.maxCost });
      }),
      this.eventBus.on('budget:request_blocked', (event) => {
        this.broadcast({ type: 'budget_event', event: 'request_blocked', budgetId: event.budgetId, currentCost: event.currentCost, maxCost: event.maxCost, agentId: event.agentId });
      }),
      this.eventBus.on('orchestration:delegation_started', (event) => {
        this.broadcast({ type: 'orchestration_event', event: 'delegation_started', sourceAgentId: event.sourceAgentId, targetAgentId: event.targetAgentId, data: { requestId: event.requestId, message: event.message }, timestamp: event.timestamp.toISOString() });
      }),
      this.eventBus.on('orchestration:delegation_completed', (event) => {
        this.broadcast({ type: 'orchestration_event', event: 'delegation_completed', sourceAgentId: event.sourceAgentId, targetAgentId: event.targetAgentId, data: { requestId: event.requestId, durationMs: event.durationMs, success: event.success }, timestamp: event.timestamp.toISOString() });
      }),
      this.eventBus.on('orchestration:fanout_started', (event) => {
        this.broadcast({ type: 'orchestration_event', event: 'fanout_started', sourceAgentId: event.sourceAgentId, targetAgentIds: event.targetAgentIds, data: { requestId: event.requestId }, timestamp: event.timestamp.toISOString() });
      }),
      this.eventBus.on('orchestration:fanout_completed', (event) => {
        this.broadcast({ type: 'orchestration_event', event: 'fanout_completed', sourceAgentId: event.sourceAgentId, targetAgentIds: event.targetAgentIds, data: { requestId: event.requestId, results: event.results, durationMs: event.durationMs }, timestamp: event.timestamp.toISOString() });
      }),
      this.eventBus.on('orchestration:scratchpad_updated', (event) => {
        this.broadcast({ type: 'orchestration_event', event: 'scratchpad_updated', data: { agentId: event.agentId, key: event.key, action: event.action }, timestamp: event.timestamp.toISOString() });
      }),
      this.eventBus.on('orchestration:task_created', (event) => {
        this.broadcast({ type: 'orchestration_event', event: 'task_created', data: { agentId: event.agentId, taskId: event.taskId, title: event.title, assignee: event.assignee }, timestamp: event.timestamp.toISOString() });
      }),
      this.eventBus.on('orchestration:task_status_changed', (event) => {
        this.broadcast({ type: 'orchestration_event', event: 'task_status_changed', data: { agentId: event.agentId, taskId: event.taskId, status: event.status }, timestamp: event.timestamp.toISOString() });
      }),
    );
  }

  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  private broadcast(msg: WsServerMessage): void {
    this.connections.broadcast(JSON.stringify(msg));
  }
}
