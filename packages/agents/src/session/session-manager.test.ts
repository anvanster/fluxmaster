import { describe, it, expect, vi } from 'vitest';
import type { IConversationStore, StoredMessage } from '@fluxmaster/core';
import { SessionManager } from './session-manager.js';

const mockConfig = {
  id: 'test-agent',
  model: 'claude-sonnet-4',
  tools: [],
};

function createMockStore(): IConversationStore {
  return {
    createConversation: vi.fn(),
    saveMessage: vi.fn(),
    getMessages: vi.fn().mockReturnValue([]),
    clearMessages: vi.fn(),
    listConversations: vi.fn().mockReturnValue([]),
    getConversation: vi.fn(),
    deleteConversation: vi.fn(),
    updateConversationTitle: vi.fn(),
  };
}

describe('SessionManager', () => {
  it('creates session with unique ID', () => {
    const manager = new SessionManager();
    const session = manager.create(mockConfig);
    expect(session.id).toBeTruthy();
    expect(session.agentConfig).toBe(mockConfig);
    expect(session.messages).toEqual([]);
    expect(session.isActive).toBe(true);
  });

  it('stores and retrieves message history', () => {
    const manager = new SessionManager();
    const session = manager.create(mockConfig);

    manager.addMessage(session.id, {
      role: 'user',
      content: 'hello',
      timestamp: new Date(),
    });

    const messages = manager.getMessages(session.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('hello');
  });

  it('updates lastActiveAt on new messages', () => {
    const manager = new SessionManager();
    const session = manager.create(mockConfig);
    const beforeAdd = session.lastActiveAt;

    // Small delay to ensure different timestamp
    manager.addMessage(session.id, {
      role: 'user',
      content: 'test',
      timestamp: new Date(),
    });

    expect(session.lastActiveAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
  });

  it('isolates sessions', () => {
    const manager = new SessionManager();
    const session1 = manager.create({ ...mockConfig, id: 'agent-1' });
    const session2 = manager.create({ ...mockConfig, id: 'agent-2' });

    manager.addMessage(session1.id, { role: 'user', content: 'msg1', timestamp: new Date() });
    manager.addMessage(session2.id, { role: 'user', content: 'msg2', timestamp: new Date() });

    expect(manager.getMessages(session1.id)).toHaveLength(1);
    expect(manager.getMessages(session2.id)).toHaveLength(1);
    expect(manager.getMessages(session1.id)[0].content).toBe('msg1');
    expect(manager.getMessages(session2.id)[0].content).toBe('msg2');
  });

  it('destroys session', () => {
    const manager = new SessionManager();
    const session = manager.create(mockConfig);
    manager.destroy(session.id);
    expect(manager.get(session.id)).toBeUndefined();
  });

  it('clears messages', () => {
    const manager = new SessionManager();
    const session = manager.create(mockConfig);
    manager.addMessage(session.id, { role: 'user', content: 'test', timestamp: new Date() });
    manager.clearMessages(session.id);
    expect(manager.getMessages(session.id)).toHaveLength(0);
  });
});

describe('SessionManager with IConversationStore', () => {
  it('persists conversation on create()', () => {
    const store = createMockStore();
    const manager = new SessionManager(store);
    const session = manager.create(mockConfig);

    expect(store.createConversation).toHaveBeenCalledWith(session.id, 'test-agent');
  });

  it('persists messages on addMessage()', () => {
    const store = createMockStore();
    const manager = new SessionManager(store);
    const session = manager.create(mockConfig);

    const ts = new Date();
    manager.addMessage(session.id, { role: 'user', content: 'hello', timestamp: ts });

    expect(store.saveMessage).toHaveBeenCalledOnce();
    const savedMsg = (store.saveMessage as ReturnType<typeof vi.fn>).mock.calls[0][1] as StoredMessage;
    expect(savedMsg.conversationId).toBe(session.id);
    expect(savedMsg.agentId).toBe('test-agent');
    expect(savedMsg.role).toBe('user');
    expect(savedMsg.content).toBe('hello');
  });

  it('delegates clearMessages to store', () => {
    const store = createMockStore();
    const manager = new SessionManager(store);
    const session = manager.create(mockConfig);

    manager.addMessage(session.id, { role: 'user', content: 'test', timestamp: new Date() });
    manager.clearMessages(session.id);

    expect(store.clearMessages).toHaveBeenCalledWith(session.id);
  });

  it('deletes conversation from store on destroy()', () => {
    const store = createMockStore();
    const manager = new SessionManager(store);
    const session = manager.create(mockConfig);

    manager.destroy(session.id);
    expect(store.deleteConversation).toHaveBeenCalledWith(session.id);
  });

  it('works without store (backward compatible)', () => {
    const manager = new SessionManager();
    const session = manager.create(mockConfig);

    manager.addMessage(session.id, { role: 'user', content: 'hello', timestamp: new Date() });
    expect(manager.getMessages(session.id)).toHaveLength(1);
    manager.destroy(session.id);
    expect(manager.get(session.id)).toBeUndefined();
  });

  it('handles store errors gracefully', () => {
    const store = createMockStore();
    (store.createConversation as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('DB error'); });

    const manager = new SessionManager(store);

    // Should not throw even if store fails
    expect(() => manager.create(mockConfig)).not.toThrow();
  });
});
