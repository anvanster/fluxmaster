import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarOpen: true, theme: 'dark' });
  });

  it('starts with sidebar open', () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it('toggles sidebar', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it('sets theme', () => {
    useUiStore.getState().setTheme('light');
    expect(useUiStore.getState().theme).toBe('light');
  });
});
