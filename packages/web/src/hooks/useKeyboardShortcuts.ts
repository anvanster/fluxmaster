import { useEffect } from 'react';

export interface ShortcutDef {
  key: string;
  meta?: boolean;
  action: () => void;
  description: string;
  allowInInput?: boolean;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;

        if (e.key !== shortcut.key || !metaMatch) continue;

        if (isInputFocused() && !shortcut.allowInInput) continue;

        e.preventDefault();
        shortcut.action();
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
