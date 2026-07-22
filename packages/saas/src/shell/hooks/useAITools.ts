import * as React from 'react'
import { usePluginRuntimeOptional } from '../lib/plugins'
import { useAccessOptional } from '../../access/context'
import { getAllEntities } from '@fayz-ai/core'
import { coreAITools, buildDataPrimitiveTools, formatToolSignature } from '../lib/core-ai-tools'
import type { PluginAITool, AIToolSuggestion } from '../types/plugins'

export interface ResolvedSuggestion extends AIToolSuggestion {
  toolId: string
  category: string
}

export interface ResolvedToolEntry {
  tool: PluginAITool
  signature: string
}

export interface ResolvedToolGroup {
  category: string
  tools: ResolvedToolEntry[]
}

/**
 * Detects which plugin "owns" the current page based on route matching.
 * Returns the plugin ID or null for non-plugin pages (e.g. settings/general, dashboard).
 */
function detectActivePluginId(runtime: ReturnType<typeof usePluginRuntimeOptional>): string | null {
  if (!runtime) return null
  const path = runtime.context.currentPath

  // Check each active plugin's routes for a match
  for (const plugin of runtime.activePlugins) {
    for (const route of plugin.routes) {
      if (path === route.path || path.startsWith(`${route.path}/`)) {
        return plugin.id
      }
    }
  }

  // Also match settings sub-pages: /settings/financial → financial
  const settingsMatch = path.match(/^\/settings\/([^/]+)/)
  if (settingsMatch) {
    const tabId = settingsMatch[1]
    if (runtime.activePlugins.some((p) => p.id === tabId)) {
      return tabId
    }
  }

  return null
}

export function useAITools(): {
  tools: PluginAITool[]
  /** Plugin owning the current route, or null on non-plugin pages. */
  activePluginId: string | null
  suggestions: ResolvedSuggestion[]
  /** Suggestions from the currently active plugin only (empty on non-plugin pages) */
  contextualSuggestions: ResolvedSuggestion[]
  toolGroups: ResolvedToolGroup[]
} {
  const runtime = usePluginRuntimeOptional()
  const access = useAccessOptional()

  return React.useMemo(() => {
    const hasPermission = runtime?.context.hasPermission
    const can = access.can
    const verticalId = runtime?.context.tenant?.verticalId
    const activePluginId = detectActivePluginId(runtime)

    // Collect all tools: core + the TWO data primitives (searchRecords/
    // queryData over every CRUD entity and plugin registry — the target is a
    // parameter, its read permission checked per call) + plugin-declared.
    const allTools: PluginAITool[] = [
      ...coreAITools,
      ...buildDataPrimitiveTools({
        entities: getAllEntities(),
        registries: runtime?.registries ?? new Map(),
        queryEntities: runtime?.activePlugins.flatMap((p) => p.queryEntities ?? []) ?? [],
      }),
    ]
    if (runtime) allTools.push(...runtime.aiTools)

    // Filter by role × plan. UX only — the REAL authorization runs server-side
    // (broker catalog filter) and in the guarded executor (checkAccess/
    // guardLimit); hiding here just keeps the visible catalog honest. Falls
    // back to the runtime's role-only check when no AccessProvider is mounted.
    const tools = allTools.filter((tool) => {
      if (!tool.permission) return true
      if (can) return can(tool.permission.feature, tool.permission.action).allowed
      if (!hasPermission) return true
      return hasPermission(tool.permission)
    })

    // Flatten suggestions, filter by vertical
    const allSuggestions: ResolvedSuggestion[] = []
    for (const tool of tools) {
      if (!tool.suggestions) continue
      for (const suggestion of tool.suggestions) {
        if (suggestion.verticalId && suggestion.verticalId !== verticalId) continue
        allSuggestions.push({
          ...suggestion,
          toolId: tool.id,
          category: tool.category ?? 'General',
        })
      }
    }

    // Prioritize suggestions from the active plugin's context
    const contextualSuggestions = activePluginId
      ? allSuggestions.filter((s) => s.toolId.startsWith(`${activePluginId}.`))
      : []
    let suggestions: ResolvedSuggestion[]
    if (activePluginId) {
      const others = allSuggestions.filter((s) => !s.toolId.startsWith(`${activePluginId}.`))
      suggestions = [...contextualSuggestions, ...others]
    } else {
      suggestions = allSuggestions
    }

    // Group tools by category with signatures
    const groupMap = new Map<string, ResolvedToolEntry[]>()
    for (const tool of tools) {
      const cat = tool.category ?? 'General'
      if (!groupMap.has(cat)) groupMap.set(cat, [])
      groupMap.get(cat)!.push({
        tool,
        signature: formatToolSignature(tool),
      })
    }

    // Core first, then alphabetical
    const toolGroups: ResolvedToolGroup[] = []
    if (groupMap.has('Core')) {
      toolGroups.push({ category: 'Core', tools: groupMap.get('Core')! })
      groupMap.delete('Core')
    }
    for (const [category, groupTools] of [...groupMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      toolGroups.push({ category, tools: groupTools })
    }

    return { tools, activePluginId, suggestions, contextualSuggestions, toolGroups }
  }, [runtime, access.can])
}
