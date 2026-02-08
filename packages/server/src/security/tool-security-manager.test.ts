import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '@fluxmaster/core';
import type { ToolSecurityPolicy, ToolAuditEntry, IToolAuditStore } from '@fluxmaster/core';
import { ToolSecurityManager } from './tool-security-manager.js';

function makeAuditStore(): IToolAuditStore {
  return {
    logToolCall: vi.fn(),
    getByAgent: vi.fn().mockReturnValue([]),
    getByTool: vi.fn().mockReturnValue([]),
    getDeniedCalls: vi.fn().mockReturnValue([]),
    pruneOldEntries: vi.fn().mockReturnValue(0),
  };
}

function makePolicy(overrides?: Partial<ToolSecurityPolicy>): ToolSecurityPolicy {
  return {
    defaultLevel: 'restricted',
    toolLevels: {},
    agentPermissions: {},
    ...overrides,
  };
}

describe('ToolSecurityManager', () => {
  let eventBus: EventBus;
  let auditStore: IToolAuditStore;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = new EventBus();
    auditStore = makeAuditStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('permission level checks', () => {
    it('allows public tools by default', () => {
      const manager = new ToolSecurityManager(
        makePolicy({ defaultLevel: 'restricted', toolLevels: { read_file: 'public' } }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'read_file', {});
      expect(result.allowed).toBe(true);
    });

    it('allows restricted tools by default (default level is restricted)', () => {
      const manager = new ToolSecurityManager(
        makePolicy({ defaultLevel: 'restricted' }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'some_tool', {});
      expect(result.allowed).toBe(true);
    });

    it('denies dangerous tools when default level is restricted', () => {
      const manager = new ToolSecurityManager(
        makePolicy({ defaultLevel: 'restricted', toolLevels: { bash_execute: 'dangerous' } }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'bash_execute', {});
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('dangerous');
    });

    it('allows dangerous tools when default level is dangerous', () => {
      const manager = new ToolSecurityManager(
        makePolicy({ defaultLevel: 'dangerous', toolLevels: { bash_execute: 'dangerous' } }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'bash_execute', {});
      expect(result.allowed).toBe(true);
    });
  });

  describe('agent allowlist/denylist', () => {
    it('allows tool on agent allowlist', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          toolLevels: { bash_execute: 'dangerous' },
          agentPermissions: { 'agent-1': { allowlist: ['bash_execute'] } },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'bash_execute', {});
      expect(result.allowed).toBe(true);
    });

    it('denies tool on agent denylist', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          agentPermissions: { 'agent-1': { denylist: ['read_file'] } },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'read_file', {});
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denylist');
    });

    it('denylist takes priority over allowlist', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          agentPermissions: {
            'agent-1': {
              allowlist: ['bash_execute'],
              denylist: ['bash_execute'],
            },
          },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'bash_execute', {});
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denylist');
    });

    it('agent without explicit permissions uses default policy', () => {
      const manager = new ToolSecurityManager(
        makePolicy({ defaultLevel: 'public' }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('unknown-agent', 'any_tool', {});
      expect(result.allowed).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('allows calls within rate limit', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          agentPermissions: { 'agent-1': { maxCallsPerMinute: 5 } },
        }),
        eventBus,
        auditStore,
      );

      for (let i = 0; i < 5; i++) {
        const result = manager.canExecute('agent-1', 'read_file', {});
        expect(result.allowed).toBe(true);
        manager.recordExecution('agent-1', 'read_file');
      }
    });

    it('blocks calls exceeding rate limit', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          agentPermissions: { 'agent-1': { maxCallsPerMinute: 3 } },
        }),
        eventBus,
        auditStore,
      );

      for (let i = 0; i < 3; i++) {
        manager.recordExecution('agent-1', 'read_file');
      }

      const result = manager.canExecute('agent-1', 'read_file', {});
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limit');
    });

    it('rate limit resets after window expires', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          agentPermissions: { 'agent-1': { maxCallsPerMinute: 2 } },
        }),
        eventBus,
        auditStore,
      );

      manager.recordExecution('agent-1', 'read_file');
      manager.recordExecution('agent-1', 'read_file');
      expect(manager.canExecute('agent-1', 'read_file', {}).allowed).toBe(false);

      vi.advanceTimersByTime(61_000);
      expect(manager.canExecute('agent-1', 'read_file', {}).allowed).toBe(true);
    });
  });

  describe('filesystem policy', () => {
    it('allows paths within allowed directories', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          filesystem: { allowedPaths: ['/tmp', '/home/user/projects'] },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'read_file', { path: '/tmp/test.txt' });
      expect(result.allowed).toBe(true);
    });

    it('denies paths outside allowed directories', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          filesystem: { allowedPaths: ['/tmp'] },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'read_file', { path: '/etc/passwd' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('path');
    });

    it('denies paths in denied directories even if parent is allowed', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          filesystem: { allowedPaths: ['/home'], deniedPaths: ['/home/secret'] },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'write_file', { path: '/home/secret/key.pem' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied');
    });

    it('skips filesystem check for non-file tools', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          filesystem: { allowedPaths: ['/tmp'] },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'delegate_to_agent', { message: 'hello' });
      expect(result.allowed).toBe(true);
    });
  });

  describe('network policy', () => {
    it('allows URLs matching allowed patterns', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          network: { allowedUrls: ['https://api.github.com'] },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'browser_navigate', { url: 'https://api.github.com/repos' });
      expect(result.allowed).toBe(true);
    });

    it('denies URLs not matching allowed patterns', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          network: { allowedUrls: ['https://api.github.com'] },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'browser_navigate', { url: 'https://evil.com' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('URL');
    });

    it('denies URLs matching denied patterns', () => {
      const manager = new ToolSecurityManager(
        makePolicy({
          network: { allowedUrls: ['https://'], deniedUrls: ['https://evil.com'] },
        }),
        eventBus,
        auditStore,
      );
      const result = manager.canExecute('agent-1', 'browser_navigate', { url: 'https://evil.com/phish' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied');
    });
  });

  describe('event emission', () => {
    it('emits security:tool_denied on denial', () => {
      const handler = vi.fn();
      eventBus.on('security:tool_denied', handler);

      const manager = new ToolSecurityManager(
        makePolicy({
          agentPermissions: { 'agent-1': { denylist: ['bash_execute'] } },
        }),
        eventBus,
        auditStore,
      );

      manager.canExecute('agent-1', 'bash_execute', {});
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].toolName).toBe('bash_execute');
    });

    it('emits security:rate_limited when rate exceeded', () => {
      const handler = vi.fn();
      eventBus.on('security:rate_limited', handler);

      const manager = new ToolSecurityManager(
        makePolicy({
          agentPermissions: { 'agent-1': { maxCallsPerMinute: 1 } },
        }),
        eventBus,
        auditStore,
      );

      manager.recordExecution('agent-1', 'read_file');
      manager.canExecute('agent-1', 'read_file', {});

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].limit).toBe(1);
    });

    it('does not emit events on allowed calls', () => {
      const deniedHandler = vi.fn();
      const rateLimitHandler = vi.fn();
      eventBus.on('security:tool_denied', deniedHandler);
      eventBus.on('security:rate_limited', rateLimitHandler);

      const manager = new ToolSecurityManager(
        makePolicy({ defaultLevel: 'public' }),
        eventBus,
        auditStore,
      );

      manager.canExecute('agent-1', 'read_file', {});
      expect(deniedHandler).not.toHaveBeenCalled();
      expect(rateLimitHandler).not.toHaveBeenCalled();
    });
  });
});
