import type { AgentConfig, ModelEndpoint, AgentStatus } from '@fluxmaster/core';
import { createChildLogger } from '@fluxmaster/core';
import type { ToolRegistry } from '@fluxmaster/tools';
import type { IModelAdapter, AdapterMessage } from './adapters/adapter.interface.js';
import { AnthropicAdapter } from './adapters/anthropic-adapter.js';
import { OpenAIAdapter } from './adapters/openai-adapter.js';
import { runToolLoop, type ToolLoopResult } from './tool-loop.js';
import { runToolLoopStream } from './tool-loop-stream.js';
import type { StreamEvent } from './adapters/adapter.interface.js';
import { SessionManager } from './session/session-manager.js';

const logger = createChildLogger('agent-worker');

export class AgentWorker {
  readonly config: AgentConfig;
  private adapter: IModelAdapter;
  private toolRegistry: ToolRegistry;
  private sessionManager: SessionManager;
  private sessionId: string;
  private _status: AgentStatus = 'idle';

  constructor(
    config: AgentConfig,
    endpoint: ModelEndpoint,
    toolRegistry: ToolRegistry,
    sessionManager: SessionManager,
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

    // Create session
    const session = sessionManager.create(config);
    this.sessionId = session.id;

    logger.info({ agentId: config.id, model: config.model, provider: this.adapter.provider },
      'Agent worker created');
  }

  get status(): AgentStatus {
    return this._status;
  }

  async process(userMessage: string): Promise<ToolLoopResult> {
    this._status = 'processing';
    logger.debug({ agentId: this.config.id, message: userMessage.slice(0, 100) }, 'Processing message');

    try {
      // Build adapter messages from session history
      const session = this.sessionManager.get(this.sessionId);
      if (!session) {
        throw new Error(`Session ${this.sessionId} not found`);
      }

      // Add user message to session
      this.sessionManager.addMessage(this.sessionId, {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // Build adapter messages from session history
      const adapterMessages: AdapterMessage[] = session.messages.map(msg => ({
        role: msg.role === 'tool' ? 'user' : msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Get tools in correct format
      const isAnthropic = this.adapter.provider === 'anthropic';
      const tools = isAnthropic
        ? this.toolRegistry.toAnthropicFormat(this.config.tools.length > 0 ? this.config.tools : undefined)
        : this.toolRegistry.toOpenAIFormat(this.config.tools.length > 0 ? this.config.tools : undefined);

      const result = await runToolLoop(adapterMessages, {
        adapter: this.adapter,
        model: this.config.model,
        systemPrompt: this.config.systemPrompt,
        tools,
        toolRegistry: this.toolRegistry,
        maxTokens: this.config.maxTokens ?? 8192,
        temperature: this.config.temperature ?? 0.7,
      });

      // Store assistant response in session
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
        systemPrompt: this.config.systemPrompt,
        tools,
        toolRegistry: this.toolRegistry,
        maxTokens: this.config.maxTokens ?? 8192,
        temperature: this.config.temperature ?? 0.7,
        onStreamEvent,
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

  clearHistory(): void {
    this.sessionManager.clearMessages(this.sessionId);
  }

  terminate(): void {
    this._status = 'terminated';
    this.sessionManager.destroy(this.sessionId);
    logger.info({ agentId: this.config.id }, 'Agent worker terminated');
  }
}
