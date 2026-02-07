import type { EventBus, IConversationStore } from '@fluxmaster/core';
import type { AgentManager } from '@fluxmaster/agents';
import type { SqliteAiFeatureStore } from '../db/stores/ai-feature-store.js';
import type { WsServerMessage } from '../shared/ws-types.js';
import { TITLE_PROMPT, SUGGESTIONS_PROMPT } from './prompts.js';

const AI_AGENT_ID = '_ai-features';

export interface AiFeatureServiceOptions {
  eventBus: EventBus;
  agentManager: AgentManager;
  conversationStore: IConversationStore;
  aiFeatureStore: SqliteAiFeatureStore;
  broadcast: (msg: WsServerMessage) => void;
  config: {
    autoTitle: boolean;
    suggestedFollowUps: boolean;
    conversationSummary: boolean;
    model: string;
  };
}

export class AiFeatureService {
  private options: AiFeatureServiceOptions;
  private unsubscribers: Array<() => void> = [];

  constructor(options: AiFeatureServiceOptions) {
    this.options = options;
  }

  start(): void {
    const unsub = this.options.eventBus.on('message:completed', (event) => {
      // Don't process our own messages
      if (event.agentId === AI_AGENT_ID) return;

      this.handleMessageCompleted(event).catch(() => {
        // Errors are non-fatal — swallow silently
      });
    });
    this.unsubscribers.push(unsub);
  }

  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  private async handleMessageCompleted(event: {
    agentId: string;
    requestId: string;
    text: string;
    usage: { inputTokens: number; outputTokens: number };
    iterations: number;
    timestamp: Date;
  }): Promise<void> {
    const { agentId, requestId, text: assistantText } = event;
    const { config, conversationStore, agentManager } = this.options;

    // Find the conversation for this agent — look at the latest messages
    const messages = conversationStore.getMessages(agentId);
    if (messages.length === 0) return;

    const conversationId = messages[0].conversationId;
    const conversation = conversationStore.getConversation(conversationId);
    if (!conversation) return;

    // Find the user message that triggered this response
    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    const userText = lastUserMessage?.content ?? '';

    // Auto-title: only on first response when no title exists
    if (config.autoTitle && !conversation.title) {
      await this.generateTitle(conversationId, userText, assistantText);
    }

    // Suggested follow-ups
    if (config.suggestedFollowUps) {
      await this.generateSuggestions(requestId, conversationId, userText, assistantText);
    }
  }

  private async generateTitle(conversationId: string, userText: string, assistantText: string): Promise<void> {
    try {
      const prompt = TITLE_PROMPT
        .replace('{userMessage}', userText)
        .replace('{assistantMessage}', assistantText.substring(0, 500));

      const result = await this.options.agentManager.routeMessage(AI_AGENT_ID, prompt);
      const title = result.text.trim().substring(0, 50);

      if (title) {
        this.options.conversationStore.updateConversationTitle(conversationId, title);
        this.options.broadcast({
          type: 'ai_feature',
          feature: 'title',
          conversationId,
          data: { title },
        } as WsServerMessage);
      }
    } catch {
      // Non-fatal
    }
  }

  private async generateSuggestions(requestId: string, conversationId: string, userText: string, assistantText: string): Promise<void> {
    try {
      const prompt = SUGGESTIONS_PROMPT
        .replace('{userMessage}', userText)
        .replace('{assistantMessage}', assistantText.substring(0, 500));

      const result = await this.options.agentManager.routeMessage(AI_AGENT_ID, prompt);

      let suggestions: string[];
      try {
        suggestions = JSON.parse(result.text.trim());
        if (!Array.isArray(suggestions)) return;
      } catch {
        return;
      }

      this.options.aiFeatureStore.saveSuggestions(requestId, conversationId, suggestions);
      this.options.broadcast({
        type: 'ai_feature',
        feature: 'suggestions',
        requestId,
        conversationId,
        data: { suggestions },
      } as WsServerMessage);
    } catch {
      // Non-fatal
    }
  }
}
