import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  commandPaletteOpen: boolean;
  shortcutsModalOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  theme: 'dark',
  commandPaletteOpen: false,
  shortcutsModalOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
}));
