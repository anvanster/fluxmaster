import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, type ShortcutDef } from './useKeyboardShortcuts';

function fireKey(key: string, opts: Partial<KeyboardEvent> = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('useKeyboardShortcuts', () => {
  let handler: ReturnType<typeof vi.fn>;
  let shortcuts: ShortcutDef[];

  beforeEach(() => {
    handler = vi.fn();
    shortcuts = [
      { key: 'k', meta: true, action: handler, description: 'Open palette' },
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires action on matching key combo', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));
    fireKey('k', { metaKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire without meta key', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));
    fireKey('k');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire when input is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true });

    renderHook(() => useKeyboardShortcuts(shortcuts));
    fireKey('k', { metaKey: true });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });

  it('fires non-meta shortcuts (like ?)', () => {
    const helpHandler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: '?', action: helpHandler, description: 'Help' },
      ]),
    );
    fireKey('?');
    expect(helpHandler).toHaveBeenCalledOnce();
  });

  it('skips non-meta shortcuts when input focused', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    Object.defineProperty(document, 'activeElement', { value: textarea, configurable: true });

    const helpHandler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: '?', action: helpHandler, description: 'Help' },
      ]),
    );
    fireKey('?');
    expect(helpHandler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });

  it('always fires Escape even when input focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true });

    const escHandler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'Escape', action: escHandler, description: 'Close', allowInInput: true },
      ]),
    );
    fireKey('Escape');
    expect(escHandler).toHaveBeenCalledOnce();

    document.body.removeChild(input);
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true });
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));
    unmount();
    fireKey('k', { metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports ctrl key as alternative to meta', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));
    fireKey('k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });
});
