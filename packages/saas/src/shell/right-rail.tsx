import * as React from 'react'
import { create } from 'zustand'

/** The shell's companion column: one open state, one active tab, and a
 *  registry anything can put a panel in. */

export interface RightRailPanelDef {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  /** Lower sorts first. Default 100. */
  order?: number
  /** Count chip on the tab. Hidden when count is 0. `destructive` renders the
   *  attention red (open tasks); default is the neutral muted chip. */
  badge?: { count: number; tone?: 'neutral' | 'destructive' }
  /** Mounted only while active. Must carry its own providers — the rail
   *  renders it far from where it was registered. */
  Component: React.ComponentType
}

interface RightRailState {
  /** A shell able to render the rail is mounted. Contributors read this to
   *  decide between the rail and their own fallback surface. */
  mounted: boolean
  setMounted: (mounted: boolean) => void
  open: boolean
  /** Panel id currently showing. Meaningless while `open` is false. */
  active: string | null
  panels: RightRailPanelDef[]
  openPanel: (id: string) => void
  close: () => void
  /** Same tab closes, a different tab switches. */
  togglePanel: (id: string) => void
  registerPanel: (panel: RightRailPanelDef) => void
  unregisterPanel: (id: string) => void
  /** Distance (px) from the viewport's right edge to the open column's left
   *  edge — MEASURED from the rendered card, so clamps and drags are included.
   *  The FAB reads it to stay anchored to the CONTENT's bottom-right corner. */
  width: number
  setWidth: (width: number) => void
}

export const useRightRailStore = create<RightRailState>((set) => ({
  mounted: false,
  setMounted: (mounted) => set({ mounted }),
  open: false,
  active: null,
  panels: [],

  openPanel: (id) => set({ open: true, active: id }),
  close: () => set({ open: false }),
  togglePanel: (id) =>
    set((s) => (s.open && s.active === id ? { open: false } : { open: true, active: id })),

  registerPanel: (panel) =>
    set((s) => {
      const rest = s.panels.filter((p) => p.id !== panel.id)
      const panels = [...rest, panel].sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
      // First to arrive becomes the default tab.
      return { panels, active: s.active ?? panel.id }
    }),

  unregisterPanel: (id) =>
    set((s) => {
      const panels = s.panels.filter((p) => p.id !== id)
      const active = s.active === id ? (panels[0]?.id ?? null) : s.active
      return { panels, active, open: active ? s.open : false }
    }),

  width: readRightRailWidth(),
  setWidth: (width) => set({ width }),
}))

/** Register a panel while the caller is mounted. `Component` must be
 *  referentially stable or the panel remounts on every parent render. */
export function useRightRailPanel(panel: RightRailPanelDef | null): void {
  const register = useRightRailStore((s) => s.registerPanel)
  const unregister = useRightRailStore((s) => s.unregisterPanel)
  const id = panel?.id
  const label = panel?.label
  const order = panel?.order
  const Component = panel?.Component
  const icon = panel?.icon
  const badgeCount = panel?.badge?.count
  const badgeTone = panel?.badge?.tone

  React.useEffect(() => {
    if (!id || !Component) return
    register({
      id,
      label: label ?? id,
      order,
      Component,
      icon,
      badge: badgeCount !== undefined ? { count: badgeCount, tone: badgeTone } : undefined,
    })
    return () => unregister(id)
  }, [id, label, order, Component, icon, badgeCount, badgeTone, register, unregister])
}

/** No panels registered means no column and no divider. */
export function useHasRightRail(): boolean {
  return useRightRailStore((s) => s.panels.length > 0)
}

const WIDTH_KEY = 'fayz.shell.right-rail.width'

/** The user's dragged width, remembered per browser. */
export function readRightRailWidth(fallback = 380): number {
  try {
    const stored = Number(localStorage?.getItem(WIDTH_KEY))
    return Number.isFinite(stored) && stored > 0 ? stored : fallback
  } catch {
    return fallback
  }
}

export function writeRightRailWidth(width: number): void {
  try {
    localStorage?.setItem(WIDTH_KEY, String(Math.round(width)))
  } catch {
    /* preference stays session-only */
  }
}
