import type { FayzAppParams, FayzRuntimeEnvironment } from './types'

function readSearchParams(): URLSearchParams {
  const href = globalThis.location?.href
  return href ? new URL(href).searchParams : new URLSearchParams()
}

function readMeta(name: string): string | undefined {
  const documentRef = globalThis.document
  const value = documentRef?.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content?.trim()
  return value || undefined
}

function readEnv(name: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return env?.[name]?.trim() || undefined
}

function firstValue(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim())?.trim()
}

function normalizeEnvironment(value?: string): FayzRuntimeEnvironment {
  return value === 'production' ? 'production' : 'preview'
}

export function resolveAppParams(): FayzAppParams {
  const search = readSearchParams()
  const token = firstValue(
    search.get('token') ?? undefined,
    search.get('fayz_token') ?? undefined,
    readMeta('fayz-token'),
    readEnv('VITE_FAYZ_TOKEN'),
  )
  const appId = firstValue(
    search.get('appId') ?? undefined,
    search.get('app_id') ?? undefined,
    readMeta('fayz-app-id'),
    readEnv('VITE_FAYZ_APP_ID'),
  )
  const projectId = firstValue(
    search.get('projectId') ?? undefined,
    search.get('project_id') ?? undefined,
    readMeta('fayz-project-id'),
    readEnv('VITE_FAYZ_PROJECT_ID'),
  )
  const apiBaseUrl = firstValue(
    search.get('apiBaseUrl') ?? undefined,
    search.get('api_base_url') ?? undefined,
    readMeta('fayz-api-base-url'),
    readEnv('VITE_FAYZ_API_BASE_URL'),
    globalThis.location?.origin,
  ) ?? ''
  const environment = normalizeEnvironment(firstValue(
    search.get('environment') ?? undefined,
    readMeta('fayz-environment'),
    readEnv('VITE_FAYZ_ENVIRONMENT'),
  ))

  return {
    apiBaseUrl,
    environment,
    ...(appId ? { appId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(token ? { token } : {}),
  }
}

export const appParams = resolveAppParams()
