import * as React from 'react'
import { usePluginRuntimeOptional, getWidgetsForZone, resolvePluginComponent } from '@fayz/core'

/** Renders all plugin widgets registered for a zone, in order. Plugins fill
 *  these slots (detail-tab zones, page zones) without the host knowing them. */
export function WidgetSlot({ zone, ...props }: { zone: string } & Record<string, unknown>) {
  const runtime = usePluginRuntimeOptional()
  if (!runtime) return null
  const widgets = getWidgetsForZone(runtime, zone)
  if (!widgets.length) return null
  return (
    <>
      {widgets.map((widget, i) => {
        const Component = resolvePluginComponent(widget)
        if (!Component) return null
        return <Component key={widget.id ?? `${zone}-${i}`} {...(widget.props ?? {})} {...props} />
      })}
    </>
  )
}
