import * as React from 'react'
import { usePluginRuntimeOptional, getWidgetsForZone, resolvePluginComponent } from '@fayz-ai/core'

/** Renders all plugin widgets registered for a zone, in order. Plugins fill
 *  these slots (detail-tab zones, page zones) without the host knowing them. */
export function WidgetSlot({
  zone,
  contextOverrides,
  ...props
}: { zone: string; contextOverrides?: Record<string, unknown> } & Record<string, unknown>) {
  const runtime = usePluginRuntimeOptional()
  if (!runtime) return null
  const widgets = getWidgetsForZone(runtime, zone, contextOverrides as never)
  if (!widgets.length) return null
  return (
    <>
      {widgets.map((widget, i) => {
        const Component = resolvePluginComponent(widget) as React.ComponentType<Record<string, unknown>> | undefined
        if (!Component) return null
        const w = widget as unknown as { config?: unknown; plugin?: unknown; props?: Record<string, unknown> }
        // Pass BOTH contracts: the saas-core widget contract (config/runtime/
        // plugin/widget) the de-bridged plugins expect, AND the spread props
        // that native archetype zones use.
        return (
          <Component
            key={widget.id ?? `${zone}-${i}`}
            config={w.config}
            runtime={{ ...runtime.context, ...(contextOverrides ?? {}) }}
            plugin={w.plugin}
            widget={widget}
            {...(w.props ?? {})}
            {...props}
          />
        )
      })}
    </>
  )
}
