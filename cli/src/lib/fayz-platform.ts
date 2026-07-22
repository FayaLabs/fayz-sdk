// Fayz platform API client for `fayz deploy` (milestone P5.1). Mirrors the
// injectable-fetch, dependency-free style of lib/supabase-management.ts: the ONLY
// network surface is the injected (or global) fetch, so unit tests exercise the
// full create→upload→publish loop against a mocked fetch and never touch the real
// platform or read a real token.
//
// Platform contract (built against, platform-side enablement tracked as P5.2):
//   Base URL: env FAYZ_API_URL, default https://beta.fayz.ai/api
//   Auth:     Authorization: Bearer fayz_<token>  (PAT; dual-auth is rolling out)
//   POST /projects                       → { id, ... }
//   POST /projects/:id/files             → batch upsert [{ path, content }]
//   POST /projects/:id/publish           → build → { url } and/or { subdomain }
//   GET  /projects/:id                   → project info

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DEFAULT_BASE_URL = 'https://beta.fayz.ai/api'
export const LIVE_HOST = 'live.fayz.ai'

/** Injectable fetch — matches the DOM/Node `fetch` shape used here. */
export type FetchImpl = typeof globalThis.fetch

/** A single source file to upsert into a platform project. */
export interface DeployFile {
  path: string
  content: string
}

export interface CreatePlatformClientOptions {
  /** API base URL (no trailing slash needed). */
  baseUrl?: string
  /** PAT with the `fayz_` prefix. Sent as `Authorization: Bearer <token>`. */
  token: string
  /** Injected so tests can mock the network entirely. Defaults to global fetch. */
  fetchImpl?: FetchImpl
  /** Max files per upload batch. Defaults to 100. */
  batchSize?: number
}

export interface ProjectInfo {
  id: string
  [key: string]: unknown
}

export interface PublishResult {
  /** The live URL, either returned directly or constructed from `subdomain`. */
  url: string
  /** Raw response body (parsed) for callers that want more. */
  raw: unknown
}

export interface UploadProgress {
  batch: number
  totalBatches: number
  filesInBatch: number
  filesUploaded: number
  totalFiles: number
}

export interface PlatformClient {
  readonly baseUrl: string
  createProject(name: string): Promise<ProjectInfo>
  uploadFiles(
    projectId: string,
    files: DeployFile[],
    onProgress?: (p: UploadProgress) => void,
  ): Promise<{ filesUploaded: number; batches: number }>
  publishProject(projectId: string): Promise<PublishResult>
  getProject(projectId: string): Promise<ProjectInfo>
  /** PUT the derived app.manifest.json as the project's agent contract.
   *  Idempotent server-side by contractHash. */
  syncAgentContract(projectId: string, manifest: Record<string, unknown>): Promise<unknown>
}

/** Thrown when the platform API responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/** Split an array into chunks of at most `size`. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error('chunk size must be >= 1')
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Build the live URL from a publish response. Accepts either an explicit `url`
 * or a `subdomain` (constructing `https://<subdomain>.live.fayz.ai`). Tolerates
 * both being present (url wins) and nesting under common envelope keys.
 */
export function resolvePublishUrl(body: unknown): string | undefined {
  if (body == null || typeof body !== 'object') return undefined
  const obj = body as Record<string, unknown>
  // Unwrap a common { data: {...} } / { project: {...} } envelope once.
  const source =
    typeof obj.url === 'string' || typeof obj.subdomain === 'string'
      ? obj
      : (obj.data as Record<string, unknown>) ?? (obj.project as Record<string, unknown>) ?? obj
  const url = source?.url
  if (typeof url === 'string' && url) return url
  const subdomain = source?.subdomain
  if (typeof subdomain === 'string' && subdomain) return `https://${subdomain}.${LIVE_HOST}`
  return undefined
}

/**
 * Build a thin Fayz platform client. The only network surface is the injected
 * (or global) fetch — nothing else in this module reaches out. No credential is
 * ever defaulted; the caller supplies the token.
 */
export function createPlatformClient(options: CreatePlatformClientOptions): PlatformClient {
  const baseUrl = trimTrailingSlash(options.baseUrl?.trim() || DEFAULT_BASE_URL)
  const token = options.token
  const batchSize = options.batchSize ?? 100
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'no fetch implementation available — use Node >= 18, or pass fetchImpl to createPlatformClient()',
    )
  }
  if (batchSize < 1) throw new Error('batchSize must be >= 1')

  async function request(method: string, path: string, body?: unknown): Promise<unknown> {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      throw new ApiError(
        `Fayz platform ${method} ${path} returned ${res.status} ${res.statusText}: ${text.slice(0, 400)}`,
        res.status,
        text,
      )
    }
    try {
      return text ? JSON.parse(text) : null
    } catch {
      return text
    }
  }

  return {
    baseUrl,

    async createProject(name: string): Promise<ProjectInfo> {
      const body = (await request('POST', '/projects', { name })) as Record<string, unknown> | null
      const id = body?.id
      if (typeof id !== 'string' || !id) {
        throw new ApiError(
          `create project response missing an "id": ${JSON.stringify(body).slice(0, 200)}`,
          200,
          JSON.stringify(body),
        )
      }
      return body as ProjectInfo
    },

    async uploadFiles(projectId, files, onProgress) {
      const batches = chunk(files, batchSize)
      let filesUploaded = 0
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        await request('POST', `/projects/${projectId}/files`, { files: batch })
        filesUploaded += batch.length
        onProgress?.({
          batch: i + 1,
          totalBatches: batches.length,
          filesInBatch: batch.length,
          filesUploaded,
          totalFiles: files.length,
        })
      }
      return { filesUploaded, batches: batches.length }
    },

    async publishProject(projectId): Promise<PublishResult> {
      const raw = await request('POST', `/projects/${projectId}/publish`)
      const url = resolvePublishUrl(raw)
      if (!url) {
        throw new ApiError(
          `publish response did not include a url or subdomain: ${JSON.stringify(raw).slice(0, 200)}`,
          200,
          JSON.stringify(raw),
        )
      }
      return { url, raw }
    },

    async getProject(projectId): Promise<ProjectInfo> {
      const body = (await request('GET', `/projects/${projectId}`)) as Record<string, unknown> | null
      return (body ?? {}) as ProjectInfo
    },

    async syncAgentContract(projectId, manifest) {
      return request('PUT', `/projects/${projectId}/agent-contract`, { manifest })
    },
  }
}

// ---------------------------------------------------------------------------
// Token format
// ---------------------------------------------------------------------------

export const TOKEN_PREFIX = 'fayz_'

/** True when `token` has the required `fayz_` PAT prefix and some body after it. */
export function isValidTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.startsWith(TOKEN_PREFIX) && token.length > TOKEN_PREFIX.length
}

/** Mask a token for display: `fayz_abc…xyz` (never prints the full secret). */
export function maskToken(token: string): string {
  if (!token) return '(vazio)'
  if (token.length <= 10) return `${token.slice(0, 4)}…`
  return `${token.slice(0, 8)}…${token.slice(-3)}`
}

// ---------------------------------------------------------------------------
// Credential storage — ~/.fayz/credentials.json (mode 0600)
// ---------------------------------------------------------------------------

export const CREDENTIALS_ENV_VAR = 'FAYZ_TOKEN'
export const BASE_URL_ENV_VAR = 'FAYZ_API_URL'

export interface StoredCredentials {
  token: string
  baseUrl?: string
}

/** Injectable filesystem so credential read/write is unit-testable. */
export interface CredentialIo {
  exists: (path: string) => boolean
  read: (path: string) => string
  writeSecure: (path: string, content: string) => void
  remove: (path: string) => void
  ensureDir: (path: string) => void
}

/** Default IO: real fs with a 0700 dir and 0600 file (owner-only). */
export const defaultCredentialIo: CredentialIo = {
  exists: (p) => existsSync(p),
  read: (p) => readFileSync(p, 'utf8'),
  writeSecure: (p, c) => writeFileSync(p, c, { mode: 0o600 }),
  remove: (p) => rmSync(p, { force: true }),
  ensureDir: (p) => mkdirSync(p, { recursive: true, mode: 0o700 }),
}

/** `~/.fayz` config directory. */
export function fayzConfigDir(home: string = homedir()): string {
  return join(home, '.fayz')
}

/** `~/.fayz/credentials.json`. */
export function credentialsPath(home: string = homedir()): string {
  return join(fayzConfigDir(home), 'credentials.json')
}

/** Read stored credentials, or null when absent/unreadable/malformed. */
export function readCredentials(path: string, io: CredentialIo = defaultCredentialIo): StoredCredentials | null {
  if (!io.exists(path)) return null
  try {
    const parsed = JSON.parse(io.read(path)) as unknown
    if (parsed && typeof parsed === 'object' && typeof (parsed as StoredCredentials).token === 'string') {
      return parsed as StoredCredentials
    }
  } catch {
    /* fall through */
  }
  return null
}

/** Write credentials to `path` (creating `~/.fayz` at 0700, file at 0600). */
export function writeCredentials(
  path: string,
  cred: StoredCredentials,
  io: CredentialIo = defaultCredentialIo,
): void {
  const dir = path.slice(0, path.lastIndexOf('/')) || '.'
  io.ensureDir(dir)
  io.writeSecure(path, JSON.stringify(cred, null, 2) + '\n')
}

/** Remove stored credentials. Returns true if a file existed. */
export function removeCredentials(path: string, io: CredentialIo = defaultCredentialIo): boolean {
  if (!io.exists(path)) return false
  io.remove(path)
  return true
}

export interface TokenResolution {
  token?: string
  baseUrl?: string
  /** Where the token came from, for messaging. */
  source?: 'env' | 'file'
}

export interface ResolveTokenOptions {
  processEnv?: Record<string, string | undefined>
  /** Injectable credential reader; defaults to reading ~/.fayz/credentials.json. */
  readStored?: () => StoredCredentials | null
}

/**
 * Resolve the deploy token in precedence order:
 *   ① env FAYZ_TOKEN            (highest)
 *   ② ~/.fayz/credentials.json  (from `fayz login`)
 * The base URL resolves env FAYZ_API_URL → stored baseUrl → default.
 */
export function resolveToken(options: ResolveTokenOptions = {}): TokenResolution {
  const env = options.processEnv ?? process.env
  const readStored = options.readStored ?? (() => readCredentials(credentialsPath()))

  const envToken = env[CREDENTIALS_ENV_VAR]
  const envBaseUrl = env[BASE_URL_ENV_VAR]
  if (envToken != null && envToken !== '') {
    const result: TokenResolution = { token: envToken, source: 'env' }
    if (envBaseUrl) result.baseUrl = envBaseUrl
    return result
  }
  const stored = readStored()
  if (stored?.token) {
    const result: TokenResolution = { token: stored.token, source: 'file' }
    if (envBaseUrl) result.baseUrl = envBaseUrl
    else if (stored.baseUrl) result.baseUrl = stored.baseUrl
    return result
  }
  const result: TokenResolution = {}
  if (envBaseUrl) result.baseUrl = envBaseUrl
  return result
}
