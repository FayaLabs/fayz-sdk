import type { PluginRuntimeContext, PluginWidgetZone, ResolvedPluginWidget } from '../types/plugins'
import { getWidgetsForZone, usePluginRuntime, usePluginRuntimeOptional } from '../lib/plugins'

export function usePlugins() {
  return usePluginRuntime()
}

export function usePluginsOptional() {
  return usePluginRuntimeOptional()
}

export function useWidgets(
  zone: PluginWidgetZone,
  contextOverrides?: Partial<PluginRuntimeContext>,
): ResolvedPluginWidget[] {
  const runtime = usePluginRuntime()
  return getWidgetsForZone(runtime, zone, contextOverrides) as unknown as ResolvedPluginWidget[]
}
