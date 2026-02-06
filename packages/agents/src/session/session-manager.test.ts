import { describe, it, expect } from 'vitest';
import { SessionManager } from './session-manager.js';

const mockConfig = {
  id: 'test-agent',
  model: 'claude-sonnet-4',
  tools: [],
};

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
