import * as React from 'react'
import type {
  PluginManifest,
  PluginRuntime,
  PluginRuntimeContext,
  PluginRuntimeIssue,
  PluginRuntimeRoute,
  PluginSettingsTab,
  PluginWidgetDefinition,
  PluginWidgetZone,
  ResolvedPluginManifest,
  ResolvedPluginWidget,
  TenantPluginBinding,
  PluginRegistryDef,
  PluginAITool,
  PluginNavigationEntry,
  PluginCapability,
  PluginWidgetVisibility,
} from '../types/plugins'
import type { FeatureDeclaration } from '../types/permissions'

interface ResolvePluginRuntimeOptions {
  plugins?: PluginManifest[]
  tenantPlugins?: TenantPluginBinding[]
  hasTenantBindings?: boolean
  context: PluginRuntimeContext
}

const EMPTY_CONTEXT: PluginRuntimeContext = {
  tenant: null,
  user: null,
  currentPath: '/',
  matchedPath: '/',
  layout: 'sidebar',
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function matchesRoutePattern(pattern: string, currentPath: string): boolean {
  if (pattern === currentPath) return true
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2)
    return currentPath === base || currentPath.startsWith(`${base}/`)
  }
  if (pattern.endsWith('*')) return currentPath.startsWith(pattern.slice(0, -1))
  return false
}

function isWidgetVisible(widget: ResolvedPluginWidget, context: PluginRuntimeContext): boolean {
  if (widget.permission && context.hasPermission && !context.hasPermission(widget.permission)) return false
  const visibility: PluginWidgetVisibility | undefined = widget.visibility
  if (!visibility) return true

  if (visibility.layouts && !visibility.layouts.includes(context.layout)) return false
  if (visibility.roles && context.user?.role && !visibility.roles.includes(context.user.role)) return false
  if (visibility.roles && !context.user?.role) return false
  if (visibility.plans && context.tenant?.plan && !visibility.plans.includes(context.tenant.plan)) return false
  if (visibility.plans && !context.tenant?.plan) return false
  if (visibility.routes && !visibility.routes.some((p) => matchesRoutePattern(p, context.currentPath))) return false
  if (visibility.excludeRoutes?.some((p) => matchesRoutePattern(p, context.currentPath))) return false
  if (visibility.permissions?.length) {
    if (!context.hasPermission) return false
    if (!visibility.permissions.every((req) => context.hasPermission?.(req))) return false
  }
  if (visibility.when && !visibility.when(context)) return false
  return true
}

function normalizeSettingsTabs(plugin: PluginManifest): PluginSettingsTab[] {
  return (plugin.settings ?? []).map((entry, index) => ({
    ...entry,
    pluginId: entry.pluginId ?? plugin.id,
    order: entry.order ?? index,
    id: entry.id ?? `${plugin.id}-${slugify(entry.label)}`,
  }))
}

function createEmptyRuntime(context: PluginRuntimeContext = EMPTY_CONTEXT): PluginRuntime {
  return {
    context,
    plugins: [],
    activePlugins: [],
    routes: [],
    navigation: [],
    settingsTabs: [],
    widgets: [],
    capabilities: [],
    aiTools: [],
    registries: new Map(),
    pluginFeatures: [],
    issues: [],
  }
}

export function definePlugin<T extends PluginManifest>(plugin: T): T {
  return plugin
}

export function resolvePluginRuntime({
  plugins = [],
  tenantPlugins = [],
  hasTenantBindings,
  context,
}: ResolvePluginRuntimeOptions): PluginRuntime {
  if (plugins.length === 0) return createEmptyRuntime(context)

  const issues: PluginRuntimeIssue[] = []
  const normalizedPlugins = new Map<string, PluginManifest>()

  for (const plugin of plugins) {
    if (normalizedPlugins.has(plugin.id)) {
      issues.push({ type: 'duplicate_plugin', pluginId: plugin.id, message: `Plugin "${plugin.id}" registered more than once.` })
      continue
    }
    normalizedPlugins.set(plugin.id, plugin)
  }

  const bindings = new Map<string, TenantPluginBinding>()
  for (const b of tenantPlugins) bindings.set(b.pluginId, b)
  const bindingsAreManaged = hasTenantBindings ?? tenantPlugins.length > 0

  const requested = new Set<string>()
  const activationReason = new Map<string, ResolvedPluginManifest['activationReason']>()

  for (const plugin of normalizedPlugins.values()) {
    const binding = bindings.get(plugin.id)
    if (binding?.status === 'active') {
      requested.add(plugin.id)
      activationReason.set(plugin.id, 'tenant')
      continue
    }
    if (plugin.defaultEnabled === true || (!bindingsAreManaged && plugin.defaultEnabled !== false)) {
      requested.add(plugin.id)
      activationReason.set(plugin.id, 'default')
    }
  }

  const orderedIds: string[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(pluginId: string, ancestry: string[] = []): void {
    if (visited.has(pluginId)) return
    const plugin = normalizedPlugins.get(pluginId)
    if (!plugin) return
    if (visiting.has(pluginId)) {
      issues.push({ type: 'circular_dependency', pluginId, message: `Circular dependency: ${[...ancestry, pluginId].join(' -> ')}.` })
      return
    }
    visiting.add(pluginId)
    for (const depId of plugin.dependencies ?? []) {
      if (!normalizedPlugins.has(depId)) {
        issues.push({ type: 'missing_dependency', pluginId, dependencyId: depId, message: `Plugin "${plugin.id}" depends on missing plugin "${depId}".` })
        continue
      }
      if (requested.has(pluginId) && !requested.has(depId)) {
        requested.add(depId)
        activationReason.set(depId, 'dependency')
      }
      visit(depId, [...ancestry, pluginId])
    }
    visiting.delete(pluginId)
    visited.add(pluginId)
    orderedIds.push(pluginId)
  }

  for (const id of normalizedPlugins.keys()) visit(id)

  const resolvedById = new Map<string, ResolvedPluginManifest>()

  for (const pluginId of orderedIds) {
    const plugin = normalizedPlugins.get(pluginId)
    if (!plugin) continue
    const binding = bindings.get(plugin.id)
    const missing = (plugin.dependencies ?? []).filter((id) => !normalizedPlugins.has(id))
    const compatible = !plugin.verticalId || plugin.verticalId === context.tenant?.verticalId
    if (!compatible) {
      issues.push({ type: 'vertical_mismatch', pluginId: plugin.id, message: `Plugin "${plugin.id}" requires vertical "${plugin.verticalId}".` })
    }
    const reason = activationReason.get(plugin.id) ?? 'inactive'
    const depsReady = (plugin.dependencies ?? []).every((id) => resolvedById.get(id)?.isActive)
    const explicitlyDisabled = binding?.status === 'disabled' || binding?.status === 'removed'
    const shouldActivate = reason === 'dependency' ? true : requested.has(plugin.id) && !explicitlyDisabled
    const isActive = shouldActivate && compatible && missing.length === 0 && depsReady

    resolvedById.set(plugin.id, {
      ...plugin,
      status: isActive ? 'active' : (binding?.status ?? 'disabled'),
      isActive,
      activationReason: isActive ? reason : 'inactive',
      config: binding?.config ?? {},
      missingDependencies: missing,
      settingsTabs: normalizeSettingsTabs(plugin),
      widgets: plugin.widgets ?? [],
      resolvedRegistries: plugin.registries ?? [],
      resolvedAITools: plugin.aiTools ?? [],
    })
  }

  const resolvedPlugins = orderedIds
    .map((id) => resolvedById.get(id))
    .filter((p): p is ResolvedPluginManifest => Boolean(p))

  const activePlugins = resolvedPlugins.filter((p) => p.isActive)
  const routes: PluginRuntimeRoute[] = []
  const navigation: PluginNavigationEntry[] = []
  const settingsTabs: PluginSettingsTab[] = []
  const widgets: ResolvedPluginWidget[] = []
  const capabilities: PluginCapability[] = []
  const aiTools: PluginAITool[] = []
  const registries = new Map<string, PluginRegistryDef[]>()
  const pluginFeatures: FeatureDeclaration[] = []

  for (const plugin of activePlugins) {
    routes.push(...plugin.routes.map((r) => ({ ...r, plugin })))
    navigation.push(...plugin.navigation.map((entry, i) => ({
      ...entry,
      id: entry.id ?? `${plugin.id}:${entry.route}:${i}`,
      icon: entry.icon ?? plugin.icon,
    })))
    settingsTabs.push(...plugin.settingsTabs)
    capabilities.push(...(plugin.capabilities ?? []))
    aiTools.push(...plugin.resolvedAITools)
    if (plugin.resolvedRegistries.length > 0) registries.set(plugin.id, plugin.resolvedRegistries)
    if (plugin.declaredFeatures) pluginFeatures.push(...plugin.declaredFeatures)
    widgets.push(...plugin.widgets.map((w, i) => ({
      ...w,
      order: w.order ?? i,
      config: { ...plugin.config, ...(w.props ?? {}) },
      plugin,
    })))
  }

  navigation.sort((a, b) => {
    const order = { main: 0, secondary: 1, settings: 2 }
    return (order[a.section] ?? 99) - (order[b.section] ?? 99) || a.position - b.position
  })
  settingsTabs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  widgets.sort((a, b) => a.zone !== b.zone ? a.zone.localeCompare(b.zone) : a.order - b.order)

  return { context, plugins: resolvedPlugins, activePlugins, routes, navigation, settingsTabs, widgets, capabilities, aiTools, issues, registries, pluginFeatures }
}

export function getWidgetsForZone(
  runtime: PluginRuntime,
  zone: PluginWidgetZone,
  contextOverrides?: Partial<PluginRuntimeContext>,
): ResolvedPluginWidget[] {
  const ctx = { ...runtime.context, ...contextOverrides }
  return runtime.widgets.filter((w) => w.zone === zone && isWidgetVisible(w, ctx))
}

const PluginRuntimeContext = React.createContext<PluginRuntime | null>(null)
export const PluginRuntimeProvider = PluginRuntimeContext.Provider

export function usePluginRuntime(): PluginRuntime {
  return React.useContext(PluginRuntimeContext) ?? createEmptyRuntime()
}

export function usePluginRuntimeOptional(): PluginRuntime | null {
  return React.useContext(PluginRuntimeContext)
}
