import { describe, it, expect, beforeEach } from 'vitest';
import { useDebugStore } from './debug-store';

describe('useDebugStore', () => {
  beforeEach(() => {
    useDebugStore.setState({
      debugPanelOpen: false,
      selectedRequestId: null,
    });
  });

  it('starts with debug panel closed', () => {
    expect(useDebugStore.getState().debugPanelOpen).toBe(false);
  });

  it('toggles debug panel', () => {
    useDebugStore.getState().toggleDebugPanel();
    expect(useDebugStore.getState().debugPanelOpen).toBe(true);
    useDebugStore.getState().toggleDebugPanel();
    expect(useDebugStore.getState().debugPanelOpen).toBe(false);
  });

  it('selects a request', () => {
    useDebugStore.getState().selectRequest('req-123');
    expect(useDebugStore.getState().selectedRequestId).toBe('req-123');
  });

  it('clears selection when selecting null', () => {
    useDebugStore.getState().selectRequest('req-123');
    useDebugStore.getState().selectRequest(null);
    expect(useDebugStore.getState().selectedRequestId).toBeNull();
  });
});
