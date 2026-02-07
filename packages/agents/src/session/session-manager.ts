import { randomUUID } from 'node:crypto';
import type { AgentConfig, AgentSession, Message, IConversationStore } from '@fluxmaster/core';

export class SessionManager {
  private sessions: Map<string, AgentSession> = new Map();
  private conversationStore?: IConversationStore;

  constructor(conversationStore?: IConversationStore) {
    this.conversationStore = conversationStore;
  }

  create(agentConfig: AgentConfig): AgentSession {
    const session: AgentSession = {
      id: randomUUID(),
      agentConfig,
      messages: [],
      createdAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true,
    };
    this.sessions.set(session.id, session);

    try {
      this.conversationStore?.createConversation(session.id, agentConfig.id);
    } catch {
      // Store errors are non-fatal — in-memory session is already created
    }

    return session;
  }

  get(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.messages.push(message);
    session.lastActiveAt = new Date();

    try {
      this.conversationStore?.saveMessage(sessionId, {
        id: randomUUID(),
        conversationId: sessionId,
        agentId: session.agentConfig.id,
        role: message.role as 'user' | 'assistant',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        timestamp: message.timestamp,
      });
    } catch {
      // Store errors are non-fatal
    }
  }

  getMessages(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session.messages;
  }

  clearMessages(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.messages = [];

    try {
      this.conversationStore?.clearMessages(sessionId);
    } catch {
      // Store errors are non-fatal
    }
  }

  destroy(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);

      try {
        this.conversationStore?.deleteConversation(sessionId);
      } catch {
        // Store errors are non-fatal
      }
    }
  }

  list(): AgentSession[] {
    return Array.from(this.sessions.values());
  }
}
