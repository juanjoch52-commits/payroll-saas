import { create } from 'zustand'

// =============================================================================
// Estado global del tour guiado (compartido entre el checklist y el overlay).
// =============================================================================

type TourState = {
  isOpen: boolean
  index: number
  start: () => void
  next: () => void
  prev: () => void
  stop: () => void
}

export const useTourStore = create<TourState>((set) => ({
  isOpen: false,
  index: 0,
  start: () => set({ isOpen: true, index: 0 }),
  next: () => set((s) => ({ index: s.index + 1 })),
  prev: () => set((s) => ({ index: Math.max(0, s.index - 1) })),
  stop: () => set({ isOpen: false, index: 0 }),
}))
