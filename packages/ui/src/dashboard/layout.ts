import type { DashboardLayoutConfig, DashboardWidgetDef } from '@fayz-ai/core'

export interface LaidOutWidget {
  def: DashboardWidgetDef
  /** Effective span after applying overrides (1–4). */
  span: number
  order: number
}

/**
 * Resolve the widgets to render on a surface, in order, applying three layers:
 *   1. registration defaults (defaultVisible / defaultOrder / span)
 *   2. app config (the app curates the home surface)
 *   3. user preferences (show/hide/reorder — read but currently empty)
 *
 * Later layers win. Returns only visible widgets, sorted by effective order.
 * Accepts any DashboardWidgetDef (registry-resolved or shim-built).
 */
export function resolveDashboardLayout(
  registered: DashboardWidgetDef[],
  appConfig?: DashboardLayoutConfig,
  userPrefs?: DashboardLayoutConfig,
  /** When true, widgets are visible by default regardless of their
   *  `defaultVisible` (used on a plugin-home to show everything; the global
   *  home leaves this false so `defaultVisible:false` curates the start set). */
  forceVisibleByDefault = false,
): LaidOutWidget[] {
  type Override = { visible?: boolean; order?: number; span?: number }
  const overrides = new Map<string, Override>()
  const merge = (cfg?: DashboardLayoutConfig) => {
    for (const w of cfg?.widgets ?? []) {
      overrides.set(w.id, { ...overrides.get(w.id), ...w })
    }
  }
  merge(appConfig)
  merge(userPrefs)

  return registered
    .map((def, index) => {
      const o = overrides.get(def.id)
      const baseVisible = forceVisibleByDefault ? true : (def.defaultVisible ?? true)
      const visible = o?.visible ?? baseVisible
      const order = o?.order ?? def.defaultOrder ?? index
      const span = Math.min(Math.max(o?.span ?? def.span ?? 1, 1), 4)
      return { def, visible, order, span }
    })
    .filter((x) => x.visible)
    .sort((a, b) => a.order - b.order)
    .map(({ def, span, order }) => ({ def, span, order }))
}
