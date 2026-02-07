import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      sidebarOpen: true,
      theme: 'dark',
      commandPaletteOpen: false,
      shortcutsModalOpen: false,
    });
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

  it('opens and closes command palette', () => {
    useUiStore.getState().setCommandPaletteOpen(true);
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
    useUiStore.getState().setCommandPaletteOpen(false);
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('opens and closes shortcuts modal', () => {
    useUiStore.getState().setShortcutsModalOpen(true);
    expect(useUiStore.getState().shortcutsModalOpen).toBe(true);
    useUiStore.getState().setShortcutsModalOpen(false);
    expect(useUiStore.getState().shortcutsModalOpen).toBe(false);
  });
});
