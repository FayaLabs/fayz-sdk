import { create } from 'zustand'

interface LayoutState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  mobileDrawerOpen: boolean
  commandPaletteOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleMobileDrawer: () => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  commandPaletteOpen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  toggleMobileDrawer: () =>
    set((state) => ({ mobileDrawerOpen: !state.mobileDrawerOpen })),

  setCommandPaletteOpen: (open) =>
    set({ commandPaletteOpen: open }),
}))
