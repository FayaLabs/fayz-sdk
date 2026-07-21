import { createFayzAgentClient, type FayzAgentClient } from '@fayz-ai/sdk/agent'

/**
 * Resolves the connection to the project's Fayz agent.
 *
 * The container writes `VITE_FAYZ_PROJECT_ID`, `VITE_FAYZ_API_BASE_URL` and
 * `VITE_FAYZ_AGENT_KEY` into every preview's `.env`, so enabling an agent in
 * Fayz is enough to light up the app's assistant — no app-side config edit and
 * no key to copy. `chat.agent` overrides are for self-hosted deployments where
 * the app is built outside a Fayz container.
 */

export interface FayzAgentConnectionConfig {
  projectId?: string
  apiBaseUrl?: string
  publishableKey?: string
}

export interface ResolvedFayzAgentConnection {
  projectId: string
  apiBaseUrl: string
  publishableKey: string
}

function env(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function resolveFayzAgentConnection(
  override?: FayzAgentConnectionConfig | false,
): ResolvedFayzAgentConnection | null {
  if (override === false) return null

  const projectId = override?.projectId ?? env('VITE_FAYZ_PROJECT_ID')
  const apiBaseUrl = override?.apiBaseUrl ?? env('VITE_FAYZ_API_BASE_URL')
  const publishableKey = override?.publishableKey ?? env('VITE_FAYZ_AGENT_KEY')

  if (!projectId || !apiBaseUrl || !publishableKey) return null
  return { projectId, apiBaseUrl, publishableKey }
}

let cached: { key: string; client: FayzAgentClient } | null = null

export function getFayzAgentClient(connection: ResolvedFayzAgentConnection): FayzAgentClient {
  const key = `${connection.apiBaseUrl}|${connection.projectId}|${connection.publishableKey}`
  if (cached?.key === key) return cached.client

  const client = createFayzAgentClient({
    baseUrl: connection.apiBaseUrl,
    projectId: connection.projectId,
    publishableKey: connection.publishableKey,
  })
  cached = { key, client }
  return client
}
