import type { AgentConfig, ModelEndpoint, AgentStatus, Message, IAgentMemoryStore } from '@fluxmaster/core';
import { createChildLogger } from '@fluxmaster/core';
import type { EventBus } from '@fluxmaster/core';
import type { ToolRegistry } from '@fluxmaster/tools';
import type { IModelAdapter, AdapterMessage } from './adapters/adapter.interface.js';
import { AnthropicAdapter } from './adapters/anthropic-adapter.js';
import { OpenAIAdapter } from './adapters/openai-adapter.js';
import { runToolLoop, type ToolLoopResult, type ToolSecurityCheck } from './tool-loop.js';
import { runToolLoopStream } from './tool-loop-stream.js';
import type { StreamEvent } from './adapters/adapter.interface.js';
import { SessionManager } from './session/session-manager.js';
import { buildSystemPrompt } from './prompt-builder.js';
import { runGoalLoop, type GoalLoopResult } from './goal-loop.js';

export interface AgentWorkerOptions {
  onBeforeToolExecute?: (agentId: string, toolName: string, args: Record<string, unknown>) => ToolSecurityCheck;
  onAfterToolExecute?: (agentId: string, toolName: string) => void;
  memoryStore?: IAgentMemoryStore;
  eventBus?: EventBus;
}

const logger = createChildLogger('agent-worker');

export class AgentWorker {
  readonly config: AgentConfig;
  private adapter: IModelAdapter;
  private toolRegistry: ToolRegistry;
  private sessionManager: SessionManager;
  private sessionId: string;
  private _status: AgentStatus = 'idle';
  private securityOptions?: AgentWorkerOptions;

  constructor(
    config: AgentConfig,
    endpoint: ModelEndpoint,
    toolRegistry: ToolRegistry,
    sessionManager: SessionManager,
    securityOptions?: AgentWorkerOptions,
  ) {
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.sessionManager = sessionManager;

    // Create adapter based on provider/model
    if (config.model.startsWith('claude') || endpoint.provider === 'anthropic') {
      this.adapter = new AnthropicAdapter(endpoint.baseUrl, endpoint.apiKey);
    } else {
      this.adapter = new OpenAIAdapter(endpoint.baseUrl, endpoint.apiKey);
    }

    this.securityOptions = securityOptions;

    // Create session
    const session = sessionManager.create(config);
    this.sessionId = session.id;

    logger.info({ agentId: config.id, model: config.model, provider: this.adapter.provider },
      'Agent worker created');
  }

  get status(): AgentStatus {
    return this._status;
  }

  private getSystemPrompt(overridePrompt?: string): string | undefined {
    if (overridePrompt) return overridePrompt;

    if (this.config.persona) {
      const memoryStore = this.securityOptions?.memoryStore;
      let recentMemories;
      if (memoryStore) {
        const recalled = memoryStore.recall(this.config.id, '', 10);
        recentMemories = recalled.map(m => {
          if ('decision' in m) {
            return { type: 'decision' as const, decision: m.decision, reasoning: m.reasoning, confidence: m.confidence };
          }
          return { type: 'learning' as const, content: m.content, learningType: m.type, confidence: m.confidence };
        });
      }

      return buildSystemPrompt({
        persona: this.config.persona,
        recentMemories: recentMemories && recentMemories.length > 0 ? recentMemories : undefined,
      });
    }

    return this.config.systemPrompt;
  }

  async processGoal(goal: string): Promise<GoalLoopResult> {
    if (!this.config.persona?.autonomy) {
      throw new Error(`Agent ${this.config.id} does not have autonomy enabled`);
    }

    return runGoalLoop({
      process: async (message: string, systemPrompt?: string) => {
        return this.processWithPrompt(message, systemPrompt);
      },
      agentId: this.config.id,
      goal,
      persona: this.config.persona,
      memoryStore: this.securityOptions?.memoryStore,
      eventBus: this.securityOptions?.eventBus,
    });
  }

  private async processWithPrompt(userMessage: string, systemPrompt?: string): Promise<ToolLoopResult> {
    this._status = 'processing';

    try {
      const session = this.sessionManager.get(this.sessionId);
      if (!session) {
        throw new Error(`Session ${this.sessionId} not found`);
      }

      this.sessionManager.addMessage(this.sessionId, {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      const adapterMessages: AdapterMessage[] = session.messages.map(msg => ({
        role: msg.role === 'tool' ? 'user' : msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const isAnthropic = this.adapter.provider === 'anthropic';
      const tools = isAnthropic
        ? this.toolRegistry.toAnthropicFormat(this.config.tools.length > 0 ? this.config.tools : undefined)
        : this.toolRegistry.toOpenAIFormat(this.config.tools.length > 0 ? this.config.tools : undefined);

      const result = await runToolLoop(adapterMessages, {
        adapter: this.adapter,
        model: this.config.model,
        systemPrompt: systemPrompt ?? this.getSystemPrompt(),
        tools,
        toolRegistry: this.toolRegistry,
        maxTokens: this.config.maxTokens ?? 8192,
        temperature: this.config.temperature ?? 0.7,
        agentId: this.config.id,
        onBeforeToolExecute: this.securityOptions?.onBeforeToolExecute,
      });

      this.sessionManager.addMessage(this.sessionId, {
        role: 'assistant',
        content: result.text,
        timestamp: new Date(),
      });

      this._status = 'idle';
      return result;
    } catch (err) {
      this._status = 'error';
      throw err;
    }
  }

  async process(userMessage: string): Promise<ToolLoopResult> {
    logger.debug({ agentId: this.config.id, message: userMessage.slice(0, 100) }, 'Processing message');
    return this.processWithPrompt(userMessage);
  }

  async processStream(
    userMessage: string,
    onStreamEvent?: (event: StreamEvent) => void,
  ): Promise<ToolLoopResult> {
    this._status = 'processing';
    logger.debug({ agentId: this.config.id, message: userMessage.slice(0, 100) }, 'Processing message (streaming)');

    try {
      const session = this.sessionManager.get(this.sessionId);
      if (!session) {
        throw new Error(`Session ${this.sessionId} not found`);
      }

      this.sessionManager.addMessage(this.sessionId, {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      const adapterMessages: AdapterMessage[] = session.messages.map(msg => ({
        role: msg.role === 'tool' ? 'user' : msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const isAnthropic = this.adapter.provider === 'anthropic';
      const tools = isAnthropic
        ? this.toolRegistry.toAnthropicFormat(this.config.tools.length > 0 ? this.config.tools : undefined)
        : this.toolRegistry.toOpenAIFormat(this.config.tools.length > 0 ? this.config.tools : undefined);

      const result = await runToolLoopStream(adapterMessages, {
        adapter: this.adapter,
        model: this.config.model,
        systemPrompt: this.getSystemPrompt(),
        tools,
        toolRegistry: this.toolRegistry,
        maxTokens: this.config.maxTokens ?? 8192,
        temperature: this.config.temperature ?? 0.7,
        onStreamEvent,
        agentId: this.config.id,
        onBeforeToolExecute: this.securityOptions?.onBeforeToolExecute,
      });

      this.sessionManager.addMessage(this.sessionId, {
        role: 'assistant',
        content: result.text,
        timestamp: new Date(),
      });

      this._status = 'idle';
      return result;
    } catch (err) {
      this._status = 'error';
      throw err;
    }
  }

  getHistory(): Message[] {
    return this.sessionManager.getMessages(this.sessionId);
  }

  clearHistory(): void {
    this.sessionManager.clearMessages(this.sessionId);
  }

  terminate(): void {
    this._status = 'terminated';
    this.sessionManager.destroy(this.sessionId);
    logger.info({ agentId: this.config.id }, 'Agent worker terminated');
  }
}
