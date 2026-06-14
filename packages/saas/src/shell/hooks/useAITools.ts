import * as React from 'react'
import { usePluginRuntimeOptional } from '../lib/plugins'
import { coreAITools, generateRegistryTools, formatToolSignature } from '../lib/core-ai-tools'
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
  suggestions: ResolvedSuggestion[]
  /** Suggestions from the currently active plugin only (empty on non-plugin pages) */
  contextualSuggestions: ResolvedSuggestion[]
  toolGroups: ResolvedToolGroup[]
} {
  const runtime = usePluginRuntimeOptional()

  return React.useMemo(() => {
    const hasPermission = runtime?.context.hasPermission
    const verticalId = runtime?.context.tenant?.verticalId
    const activePluginId = detectActivePluginId(runtime)

    // Collect all tools: core + plugin-declared + auto-generated from registries
    const allTools: PluginAITool[] = [...coreAITools]

    if (runtime) {
      allTools.push(...runtime.aiTools)

      // Auto-generate registry tools for active plugins
      for (const [pluginId, registries] of runtime.registries) {
        const autoTools = generateRegistryTools(pluginId, registries)
        // Only add auto-tools that weren't explicitly declared
        const declaredIds = new Set(runtime.aiTools.map((t) => t.id))
        for (const tool of autoTools) {
          if (!declaredIds.has(tool.id)) {
            allTools.push(tool)
          }
        }
      }
    }

    // Filter by permission
    const tools = allTools.filter((tool) => {
      if (!tool.permission) return true
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

    return { tools, suggestions, contextualSuggestions, toolGroups }
  }, [runtime])
}
