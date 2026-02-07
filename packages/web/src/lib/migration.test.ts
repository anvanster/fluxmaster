import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasLocalData, migrateLocalStorageToServer } from './migration';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('migration', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('hasLocalData', () => {
    it('returns false when no localStorage data exists', () => {
      expect(hasLocalData()).toBe(false);
    });

    it('returns true when fluxmaster-chat data exists', () => {
      localStorage.setItem('fluxmaster-chat', JSON.stringify({
        state: {
          activeAgentId: 'default',
          conversations: [
            ['default', [{ id: 'm1', role: 'user', content: 'hello', timestamp: '2025-01-01' }]],
          ],
        },
        version: 0,
      }));
      expect(hasLocalData()).toBe(true);
    });

    it('returns false when data has empty conversations', () => {
      localStorage.setItem('fluxmaster-chat', JSON.stringify({
        state: { activeAgentId: 'default', conversations: [] },
        version: 0,
      }));
      expect(hasLocalData()).toBe(false);
    });
  });

  describe('migrateLocalStorageToServer', () => {
    it('migrates conversations to server API and clears localStorage', async () => {
      localStorage.setItem('fluxmaster-chat', JSON.stringify({
        state: {
          activeAgentId: 'default',
          conversations: [
            ['default', [
              { id: 'm1', role: 'user', content: 'hello', timestamp: '2025-01-01T00:00:00Z' },
              { id: 'm2', role: 'assistant', content: 'hi there', timestamp: '2025-01-01T00:00:01Z' },
            ]],
          ],
        },
        version: 0,
      }));

      // Mock POST /api/conversations → 201
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 'conv-new', agentId: 'default' }),
      });

      await migrateLocalStorageToServer();

      // Should have called fetch to create conversation
      expect(mockFetch).toHaveBeenCalled();

      // Should clear localStorage after success
      expect(localStorage.getItem('fluxmaster-chat')).toBeNull();
    });
  });
});
