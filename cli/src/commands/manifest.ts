import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  computeContractHash,
  serializeManifestWithHash,
} from '../lib/contract-hash.js'
import { createPlatformClient, resolveToken, DEFAULT_BASE_URL, ApiError } from '../lib/fayz-platform.js'

// ---------------------------------------------------------------------------
// `fayz manifest emit [dir]`  — evaluate the app's config in Node (through the
// app's OWN vite, so aliases/assets/env behave exactly like its build), run
// defineSaas, and write the derived app.manifest.json (v3, with contractHash).
// The committed manifest is 100% GENERATED — never hand-edited; diff review is
// what the commit is for. Replaces the retired `fayz extract`.
//
// `fayz manifest emit --check` — exit 1 when the committed file differs from
// the freshly derived one (the "manifest is stale" build gate; doctor --full
// will call this).
//
// `fayz manifest sync [dir]` — emit (in-memory) + PUT the manifest to the Fayz
// platform as the project's agent contract. Idempotent by contractHash.
// Auth: FAYZ_TOKEN / `fayz login`; project binding: <app>/.fayz/project.json.
// ---------------------------------------------------------------------------

const CONFIG_ENTRIES = ['src/config/app.tsx', 'src/config/app.ts', 'src/config/app.jsx', 'src/config/app.js']

interface EmitResult {
  manifest: Record<string, unknown>
  entry: string
}

function installBrowserShims(): void {
  const g = globalThis as Record<string, unknown>
  if (!g.localStorage) {
    // getItem → null makes config-time helpers (e.g. beauty's tl()) fall back
    // to their DEFAULT locale — the same behavior as a fresh browser session.
    const store = new Map<string, string>()
    g.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size
      },
    }
  }
  if (!g.navigator) g.navigator = { language: 'pt-BR', userAgent: 'fayz-cli' }
  if (!g.window) g.window = g
}

/** Heuristic: the exported FayzAppConfig is the object with a `name` and at
 *  least one of plugins/auth/theme/permissions. Default export wins. */
function pickConfigExport(mod: Record<string, unknown>): Record<string, unknown> | null {
  const candidates = ['default', ...Object.keys(mod).filter((k) => k !== 'default')]
  for (const key of candidates) {
    const value = mod[key]
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).name === 'string' &&
      ('plugins' in value || 'auth' in value || 'theme' in value || 'permissions' in value)
    ) {
      return value as Record<string, unknown>
    }
  }
  return null
}

/** Drop the live-config marker defineSaas plants for the in-browser path —
 *  it references an in-memory map and has no meaning in the serialized artifact. */
function stripLiveConfigRefs(manifest: Record<string, unknown>): void {
  const surfaces = manifest.surfaces as Record<string, { options?: Record<string, unknown> }> | undefined
  for (const surface of Object.values(surfaces ?? {})) {
    if (surface?.options && '__fayzLiveConfigRef' in surface.options) {
      delete surface.options.__fayzLiveConfigRef
    }
  }
}

/**
 * Deployment identity is STATE, not code — it cannot be derived. When a
 * committed manifest already exists, carry over:
 *  - `id` — the app's fleet identity (defineSaas slugs the display name, which
 *    is not the same thing: "BeautySoft" → beautysoft ≠ beauty-saas);
 *  - `backend.projectRef` — the linked Supabase project;
 *  - legacy backend keys (pool, tenantId, …) — folded into `backend.options`
 *    where v3 expects loose provider metadata.
 */
function preserveDeploymentIdentity(manifest: Record<string, unknown>, appDir: string): void {
  const existingPath = join(appDir, 'app.manifest.json')
  if (!existsSync(existingPath)) return
  let existing: Record<string, unknown>
  try {
    existing = JSON.parse(readFileSync(existingPath, 'utf8')) as Record<string, unknown>
  } catch {
    return
  }
  if (typeof existing.id === 'string' && existing.id) manifest.id = existing.id

  const oldBackend = existing.backend as Record<string, unknown> | undefined
  if (!oldBackend) return
  const backend = (manifest.backend ?? {}) as Record<string, unknown>
  if (!backend.projectRef && typeof oldBackend.projectRef === 'string') {
    backend.projectRef = oldBackend.projectRef
  }
  const KNOWN = new Set(['provider', 'projectRef', 'url', 'adapterId', 'options'])
  const legacy = Object.entries(oldBackend).filter(([k, v]) => !KNOWN.has(k) && v !== undefined)
  const oldOptions = (oldBackend.options ?? {}) as Record<string, unknown>
  if (legacy.length || Object.keys(oldOptions).length) {
    backend.options = { ...oldOptions, ...Object.fromEntries(legacy), ...(backend.options as object ?? {}) }
  }
  manifest.backend = backend
}

async function deriveManifest(dir: string): Promise<EmitResult> {
  const appDir = resolve(dir)
  const entry = CONFIG_ENTRIES.find((p) => existsSync(join(appDir, p)))
  if (!entry) {
    throw new Error(`no app config found — expected one of ${CONFIG_ENTRIES.join(', ')} under ${appDir}`)
  }

  installBrowserShims()

  // Load the app's own vite so aliases (fayzVite → local SDK source), env and
  // asset handling match the app's real build. ssrLoadModule executes the
  // config module graph in Node without rendering anything.
  const appRequire = createRequire(join(appDir, 'package.json'))
  let vitePath: string
  try {
    vitePath = appRequire.resolve('vite')
  } catch {
    throw new Error(`the app at ${appDir} does not have vite installed — run its package manager install first`)
  }
  interface ViteSsrServer {
    ssrLoadModule(url: string): Promise<Record<string, unknown>>
    close(): Promise<void>
  }
  type ViteApi = { createServer(options: Record<string, unknown>): Promise<ViteSsrServer> }
  const viteMod = (await import(pathToFileURL(vitePath).href)) as ViteApi & { default?: ViteApi }
  // CJS interop: when require.resolve lands on vite's CJS entry, the API sits
  // under `default`.
  const vite = typeof viteMod.createServer === 'function' ? viteMod : viteMod.default
  if (!vite || typeof vite.createServer !== 'function') {
    throw new Error('could not load vite.createServer from the app installation')
  }
  // fayzVite computes its local-SDK alias root from process.cwd(); run the
  // server from the app dir so local-source resolution behaves exactly like
  // the app's own `vite dev/build`.
  const previousCwd = process.cwd()
  process.chdir(appDir)
  const server = await vite.createServer({
    root: appDir,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
  })

  try {
    const configMod = (await server.ssrLoadModule(`/${entry}`)) as Record<string, unknown>
    const config = pickConfigExport(configMod)
    if (!config) {
      throw new Error(
        `${entry} does not export a FayzAppConfig (an object with a "name" plus plugins/auth/theme/permissions)`,
      )
    }

    // defineSaas must come from the SAME module graph as the config's own
    // imports (same entity registry instance), so resolve it through vite too.
    const saasMod = (await server.ssrLoadModule('@fayz-ai/saas')) as {
      defineSaas?: (c: unknown) => Record<string, unknown>
    }
    if (typeof saasMod.defineSaas !== 'function') {
      throw new Error('could not load defineSaas from @fayz-ai/saas in the app module graph')
    }

    const manifest = saasMod.defineSaas(config)
    stripLiveConfigRefs(manifest)
    // JSON round-trip: drops any function/undefined values a config smuggled in
    // (theme token factories etc.) so the artifact is strictly JSON.
    const clean = JSON.parse(JSON.stringify(manifest)) as Record<string, unknown>
    preserveDeploymentIdentity(clean, appDir)
    return { manifest: clean, entry }
  } finally {
    await server.close()
    process.chdir(previousCwd)
  }
}

function summarize(manifest: Record<string, unknown>): string {
  const agent = (manifest.agent ?? {}) as Record<string, unknown[]>
  const entities = Array.isArray(agent.entities) ? agent.entities.length : 0
  const tools = Array.isArray(agent.tools) ? agent.tools.length : 0
  const rpcs = Array.isArray(agent.rpcs) ? agent.rpcs.length : 0
  const limits = Array.isArray(manifest.limitDeclarations) ? manifest.limitDeclarations.length : 0
  return `v${String(manifest.manifestVersion)} · ${entities} entities · ${tools} tools · ${rpcs} rpcs · ${limits} limits`
}

export async function manifest(sub: string | undefined, args: string[]): Promise<number> {
  const flags = new Set(args.filter((a) => a.startsWith('--')))
  const dir = args.find((a) => !a.startsWith('--')) ?? process.cwd()
  const outPath = resolve(dir, 'app.manifest.json')

  if (sub !== 'emit' && sub !== 'sync') {
    console.error('Usage: fayz manifest <emit|sync> [dir] [--check] [--dry-run]')
    return 1
  }

  let derived: EmitResult
  try {
    derived = await deriveManifest(dir)
  } catch (err) {
    console.error(`✗ manifest derivation failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }

  const output = serializeManifestWithHash(derived.manifest)
  const hash = computeContractHash(derived.manifest)

  if (sub === 'emit') {
    if (flags.has('--check')) {
      if (!existsSync(outPath)) {
        console.error(`✗ ${outPath} does not exist — run 'fayz manifest emit' and commit the result`)
        return 1
      }
      const committed = readFileSync(outPath, 'utf8')
      if (committed !== output) {
        console.error('✗ app.manifest.json is STALE — the app code no longer matches the committed manifest.')
        console.error("  Run 'fayz manifest emit' and commit the diff.")
        return 1
      }
      console.log(`✓ app.manifest.json is up to date (${summarize(derived.manifest)})`)
      return 0
    }
    writeFileSync(outPath, output)
    console.log(`✓ wrote ${outPath}`)
    console.log(`  ${summarize(derived.manifest)}`)
    console.log(`  contractHash ${hash.slice(0, 12)}…`)
    return 0
  }

  // --- sync ---------------------------------------------------------------
  const linkPath = join(resolve(dir), '.fayz', 'project.json')
  if (!existsSync(linkPath)) {
    console.error(`✗ no project link at ${linkPath} — run 'fayz deploy' once to create/link the project`)
    return 1
  }
  const projectId = (JSON.parse(readFileSync(linkPath, 'utf8')) as { projectId?: string }).projectId
  if (!projectId) {
    console.error(`✗ ${linkPath} has no projectId`)
    return 1
  }

  if (flags.has('--dry-run')) {
    console.log(`dry-run: would PUT agent contract for project ${projectId}`)
    console.log(`  ${summarize(derived.manifest)} · contractHash ${hash.slice(0, 12)}…`)
    return 0
  }

  const resolved = resolveToken()
  if (!resolved.token) {
    console.error("✗ no Fayz token — run 'fayz login' or set FAYZ_TOKEN")
    return 1
  }
  const client = createPlatformClient({
    baseUrl: resolved.baseUrl ?? DEFAULT_BASE_URL,
    token: resolved.token,
  })
  try {
    const manifestWithHash = JSON.parse(output) as Record<string, unknown>
    await client.syncAgentContract(projectId, manifestWithHash)
    // Keep the committed artifact in lockstep with what the platform holds.
    writeFileSync(outPath, output)
    console.log(`✓ agent contract synced for project ${projectId}`)
    console.log(`  ${summarize(derived.manifest)} · contractHash ${hash.slice(0, 12)}…`)
    return 0
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      console.error('✗ the platform does not expose /agent-contract yet (Lane B slice S2). The derived manifest was NOT written.')
      return 1
    }
    console.error(`✗ sync failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}
