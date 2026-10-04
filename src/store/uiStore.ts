import { create } from 'zustand';

export type ActionType = 'new_share' | 'add_ghost' | 'new_group' | 'join_group' | null;

interface UiState {
  globalAction: ActionType;
  setGlobalAction: (action: ActionType) => void;
  clearGlobalAction: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  globalAction: null,
  setGlobalAction: (action) => set({ globalAction: action }),
  clearGlobalAction: () => set({ globalAction: null }),
}));
