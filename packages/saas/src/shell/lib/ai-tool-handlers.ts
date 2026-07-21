import type { OrgMember, Organization } from '@fayz-ai/core'
import type { PluginAITool } from '../types/plugins'

/**
 * Client-plane execution for the AI tool catalog.
 *
 * `useAITools()` declares *what* the app can do — it is the catalog the model
 * reasons over. This module is *how*: the browser runs the call against the
 * session that is already open (org store, plugin providers, router) and hands
 * a serialized result back to the agent.
 *
 * The split matters because Fayz never holds the app's data credentials. The
 * agent broker forwards the catalog, decides which tool to call, and returns
 * the call for the app to execute — the same contract a server-side channel
 * (WhatsApp, email) would satisfy with a server-side executor instead.
 *
 * A tool with no registered handler is advisory: it still shapes suggestions
 * and tells the model the capability exists, but the agent is told plainly
 * that it could not be executed rather than being handed a fake result.
 */

export interface AIToolExecutionContext {
  currentOrg: Organization | null
  members: OrgMember[]
  currentPath: string
  /** Pages the app exposes, used to resolve navigation requests. */
  routes: Array<{ path: string; label?: string }>
  navigate: (path: string) => void
}

export type AIToolHandler = (
  args: Record<string, unknown>,
  context: AIToolExecutionContext,
) => unknown | Promise<unknown>

const handlers = new Map<string, AIToolHandler>()

/**
 * Register an executor for a tool, keyed by the tool's `name` (the identifier
 * the model calls, e.g. `getTeamMembers`). Plugins and apps call this to make
 * their declared `aiTools` actually runnable.
 */
export function registerAIToolHandler(name: string, handler: AIToolHandler): void {
  handlers.set(name, handler)
}

export function hasAIToolHandler(name: string): boolean {
  return handlers.has(name)
}

export interface AIToolExecutionResult {
  ok: boolean
  /** JSON-serialized payload handed back to the agent. */
  content: string
}

export async function executeAITool(
  name: string,
  args: Record<string, unknown>,
  context: AIToolExecutionContext,
): Promise<AIToolExecutionResult> {
  const handler = handlers.get(name)
  if (!handler) {
    return {
      ok: false,
      content: JSON.stringify({
        error: 'not_executable',
        message: `The tool "${name}" is declared but has no handler in this app. Tell the user what you would need instead of guessing.`,
      }),
    }
  }

  try {
    const result = await handler(args, context)
    return { ok: true, content: JSON.stringify(result ?? { ok: true }) }
  } catch (error) {
    return {
      ok: false,
      content: JSON.stringify({
        error: 'execution_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

/** Shape the catalog into the JSON-Schema tool list the agent broker accepts. */
export function toAgentTools(
  tools: PluginAITool[],
): Array<{ name: string; description: string; parameters?: Record<string, unknown> }> {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as Record<string, unknown> | undefined,
  }))
}

// ---------------------------------------------------------------------------
// Core handlers — the executable counterpart of `coreAITools`.
// ---------------------------------------------------------------------------

registerAIToolHandler('getBusinessSummary', (_args, ctx) => {
  if (!ctx.currentOrg) return { error: 'no_active_business' }
  const org = ctx.currentOrg as Organization & {
    plan?: string
    verticalId?: string
    createdAt?: string
  }
  return {
    name: org.name,
    slug: org.slug,
    plan: org.plan ?? null,
    vertical: org.verticalId ?? null,
    teamSize: ctx.members.length,
    createdAt: org.createdAt ?? null,
  }
})

registerAIToolHandler('getTeamMembers', (args, ctx) => {
  const role = typeof args.role === 'string' ? args.role.toLowerCase() : undefined
  const members = ctx.members
    .filter((m) => !role || String((m as OrgMember & { role?: string }).role ?? '').toLowerCase() === role)
    .map((m) => {
      const member = m as OrgMember & { role?: string; status?: string; name?: string; email?: string }
      return {
        name: member.name ?? null,
        email: member.email ?? null,
        role: member.role ?? null,
        status: member.status ?? null,
      }
    })
  return { total: members.length, members }
})

registerAIToolHandler('navigateTo', (args, ctx) => {
  const query = typeof args.page === 'string' ? args.page.trim().toLowerCase() : ''
  if (!query) return { error: 'missing_page' }

  const match =
    ctx.routes.find((r) => r.path.toLowerCase() === query || r.path.toLowerCase() === `/${query}`) ??
    ctx.routes.find((r) => (r.label ?? '').toLowerCase() === query) ??
    ctx.routes.find((r) => r.path.toLowerCase().includes(query) || (r.label ?? '').toLowerCase().includes(query))

  if (!match) {
    return {
      error: 'page_not_found',
      availablePages: ctx.routes.map((r) => r.label ?? r.path),
    }
  }

  ctx.navigate(match.path)
  return { navigatedTo: match.path, label: match.label ?? match.path }
})
