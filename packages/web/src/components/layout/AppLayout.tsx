import { useMemo, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUiStore } from '@/stores/ui-store';
import { useDebugStore } from '@/stores/debug-store';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useKeyboardShortcuts, type ShortcutDef } from '@/hooks/useKeyboardShortcuts';
import { CommandPalette, type Command } from '@/components/common/CommandPalette';
import { ShortcutsModal } from '@/components/common/ShortcutsModal';

export function AppLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const shortcutsModalOpen = useUiStore((s) => s.shortcutsModalOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setShortcutsModalOpen = useUiStore((s) => s.setShortcutsModalOpen);
  const toggleDebugPanel = useDebugStore((s) => s.toggleDebugPanel);
  const navigate = useNavigate();

  const closeAll = useCallback(() => {
    setCommandPaletteOpen(false);
    setShortcutsModalOpen(false);
  }, [setCommandPaletteOpen, setShortcutsModalOpen]);

  const shortcuts: ShortcutDef[] = useMemo(() => [
    { key: 'k', meta: true, action: () => setCommandPaletteOpen(true), description: 'Open command palette' },
    { key: '1', meta: true, action: () => navigate(ROUTES.CHAT), description: 'Go to Chat' },
    { key: '2', meta: true, action: () => navigate(ROUTES.DASHBOARD), description: 'Go to Dashboard' },
    { key: '3', meta: true, action: () => navigate(ROUTES.ADMIN), description: 'Go to Admin' },
    { key: '/', meta: true, action: () => {
      const el = document.querySelector<HTMLTextAreaElement>('[data-testid="chat-input"]');
      el?.focus();
    }, description: 'Focus chat input' },
    { key: 'd', meta: true, action: toggleDebugPanel, description: 'Toggle debug panel' },
    { key: '?', action: () => setShortcutsModalOpen(true), description: 'Show shortcuts' },
    { key: 'Escape', action: closeAll, description: 'Close modal', allowInInput: true },
  ], [navigate, setCommandPaletteOpen, setShortcutsModalOpen, toggleDebugPanel, closeAll]);

  useKeyboardShortcuts(shortcuts);

  const commands: Command[] = useMemo(() => [
    { id: 'chat', label: 'Go to Chat', category: 'Navigation', action: () => navigate(ROUTES.CHAT), shortcut: 'Cmd+1' },
    { id: 'dashboard', label: 'Go to Dashboard', category: 'Navigation', action: () => navigate(ROUTES.DASHBOARD), shortcut: 'Cmd+2' },
    { id: 'admin', label: 'Go to Admin', category: 'Navigation', action: () => navigate(ROUTES.ADMIN), shortcut: 'Cmd+3' },
    { id: 'debug', label: 'Toggle Debug Panel', category: 'Tools', action: toggleDebugPanel, shortcut: 'Cmd+D' },
    { id: 'shortcuts', label: 'Show Keyboard Shortcuts', category: 'Help', action: () => setShortcutsModalOpen(true), shortcut: '?' },
  ], [navigate, setShortcutsModalOpen, toggleDebugPanel]);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <div className={cn('hidden lg:block', sidebarOpen && 'block')}>
        <Sidebar connectionStatus="disconnected" />
      </div>
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      <CommandPalette
        open={commandPaletteOpen}
        commands={commands}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <ShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
