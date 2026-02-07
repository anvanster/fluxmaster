import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { StoredMessage } from '@fluxmaster/core';
import { Migrator } from '../migrator.js';
import { SqliteConversationStore } from './conversation-store.js';

describe('SqliteConversationStore', () => {
  let db: Database.Database;
  let store: SqliteConversationStore;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    new Migrator(db).run();
    store = new SqliteConversationStore(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeMessage = (overrides?: Partial<StoredMessage>): StoredMessage => ({
    id: 'msg-1',
    conversationId: 'conv-1',
    agentId: 'agent-1',
    role: 'user',
    content: 'hello',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });

  it('creates conversation', () => {
    store.createConversation('conv-1', 'agent-1');
    const conv = store.getConversation('conv-1');
    expect(conv).toBeDefined();
    expect(conv!.agentId).toBe('agent-1');
  });

  it('saves and retrieves messages in order', () => {
    store.createConversation('conv-1', 'agent-1');
    store.saveMessage('conv-1', makeMessage({ id: 'msg-1', timestamp: new Date('2024-01-01T00:00:00Z') }));
    store.saveMessage('conv-1', makeMessage({ id: 'msg-2', role: 'assistant', content: 'hi', timestamp: new Date('2024-01-01T00:01:00Z') }));

    const messages = store.getMessages('conv-1');
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('hello');
    expect(messages[1].content).toBe('hi');
  });

  it('lists conversations for agent', () => {
    store.createConversation('conv-1', 'agent-1');
    store.createConversation('conv-2', 'agent-1');
    store.createConversation('conv-3', 'agent-2');

    const list = store.listConversations('agent-1');
    expect(list).toHaveLength(2);
  });

  it('returns message count in summary', () => {
    store.createConversation('conv-1', 'agent-1');
    store.saveMessage('conv-1', makeMessage({ id: 'msg-1' }));
    store.saveMessage('conv-1', makeMessage({ id: 'msg-2' }));

    const conv = store.getConversation('conv-1');
    expect(conv!.messageCount).toBe(2);
  });

  it('clears messages for a conversation', () => {
    store.createConversation('conv-1', 'agent-1');
    store.saveMessage('conv-1', makeMessage({ id: 'msg-1' }));
    store.clearMessages('conv-1');

    const messages = store.getMessages('conv-1');
    expect(messages).toHaveLength(0);
  });

  it('deletes conversation and cascades to messages', () => {
    store.createConversation('conv-1', 'agent-1');
    store.saveMessage('conv-1', makeMessage({ id: 'msg-1' }));
    store.deleteConversation('conv-1');

    expect(store.getConversation('conv-1')).toBeUndefined();
    expect(store.getMessages('conv-1')).toHaveLength(0);
  });

  it('updates conversation title', () => {
    store.createConversation('conv-1', 'agent-1');
    store.updateConversationTitle('conv-1', 'My Conversation');

    const conv = store.getConversation('conv-1');
    expect(conv!.title).toBe('My Conversation');
  });

  it('returns undefined for non-existent conversation', () => {
    expect(store.getConversation('nonexistent')).toBeUndefined();
  });
});
