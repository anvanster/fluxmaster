import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionManager } from './connection-manager.js';

function createMockSocket(readyState = 1) {
  return {
    readyState,
    send: vi.fn(),
    ping: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
  } as any;
}

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  it('adds and retrieves connections', () => {
    const socket = createMockSocket();
    manager.add('conn-1', socket);
    expect(manager.get('conn-1')).toBe(socket);
    expect(manager.count()).toBe(1);
  });

  it('removes connections', () => {
    const socket = createMockSocket();
    manager.add('conn-1', socket);
    manager.remove('conn-1');
    expect(manager.get('conn-1')).toBeUndefined();
    expect(manager.count()).toBe(0);
  });

  it('broadcasts to all open connections', () => {
    const s1 = createMockSocket(1);
    const s2 = createMockSocket(1);
    const s3 = createMockSocket(3); // CLOSED
    manager.add('1', s1);
    manager.add('2', s2);
    manager.add('3', s3);

    manager.broadcast('hello');
    expect(s1.send).toHaveBeenCalledWith('hello');
    expect(s2.send).toHaveBeenCalledWith('hello');
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('closeAll closes all sockets and clears', () => {
    const s1 = createMockSocket();
    const s2 = createMockSocket();
    manager.add('1', s1);
    manager.add('2', s2);

    manager.closeAll();
    expect(s1.close).toHaveBeenCalled();
    expect(s2.close).toHaveBeenCalled();
    expect(manager.count()).toBe(0);
  });
});
