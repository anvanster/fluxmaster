import { randomUUID } from 'node:crypto';
import type { AgentConfig, AgentSession, Message } from '@fluxmaster/core';

export class SessionManager {
  private sessions: Map<string, AgentSession> = new Map();

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
  }

  destroy(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);
    }
  }

  list(): AgentSession[] {
    return Array.from(this.sessions.values());
  }
}
