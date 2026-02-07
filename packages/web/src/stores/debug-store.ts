import { create } from 'zustand';

interface DebugState {
  debugPanelOpen: boolean;
  selectedRequestId: string | null;
  toggleDebugPanel: () => void;
  setDebugPanelOpen: (open: boolean) => void;
  selectRequest: (requestId: string | null) => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  debugPanelOpen: false,
  selectedRequestId: null,
  toggleDebugPanel: () => set((s) => ({ debugPanelOpen: !s.debugPanelOpen })),
  setDebugPanelOpen: (open) => set({ debugPanelOpen: open }),
  selectRequest: (requestId) => set({ selectedRequestId: requestId }),
}));
