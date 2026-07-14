// ---------------------------------------------------------------------------
// Integration Connector spine
// ---------------------------------------------------------------------------
// An integration is a connector that keeps canonical Fayz data in agreement
// with an external provider (Google Calendar, open banking, Shopify, …). This
// module is the thin shared contract both native (SDK) and client-built
// connectors implement. The heavy lifting (auth, fetch/push, idempotent
// upserts) runs in the data plane — typically a Supabase Edge Function — while
// the control plane (a settings tab + this contract) lives in the app/plugin.
//
// Design notes live in docs/design/bling-integration-brief.md. Proven precedents:
// the Fayz runtime OAuth broker (packages/core/src/runtime/oauth.ts) and the
// bank-statement edge functions in the predecessor app.
import type * as React from 'react'

/** How a connector authenticates to its provider. */
export type IntegrationAuthKind = 'oauth' | 'api-key' | 'mtls'

/** Which way data flows for a given capability. */
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional'

/** What causes a sync to run. */
export type SyncTrigger = 'on-write' | 'scheduled' | 'manual' | 'webhook'

/** One thing a connector can sync (an entity + its direction + triggers). */
export interface ConnectorCapability {
  /** Canonical entity synced, e.g. 'booking', 'movement'. */
  entity: string
  direction: SyncDirection
  triggers: SyncTrigger[]
}

/** The state of a tenant's connection to a provider (one row in a *_integrations table). */
export interface ConnectionConfig {
  /** Provider key, e.g. 'google', 'plugbank'. */
  provider: string
  /** Whether the connection is active and should sync. */
  active: boolean
  /** Opaque, provider-specific config (calendar id, account id, cursor, …). Never secrets. */
  settings?: Record<string, unknown>
  /** Last successful sync, ISO timestamp. */
  lastSyncAt?: string
}

/** Audit record of one sync execution (generalizes *_sync_log / *_sync_runs). */
export interface SyncRun {
  id?: string
  provider: string
  direction: SyncDirection
  trigger: SyncTrigger
  status: 'success' | 'partial' | 'error'
  /** Items pulled/pushed and how many were written. */
  fetched?: number
  written?: number
  /** Pagination/incremental cursor advanced by this run. */
  cursor?: string
  error?: string
  startedAt?: string
  finishedAt?: string
}

export interface TestConnectionResult {
  ok: boolean
  message?: string
}

/**
 * A connector's control-plane descriptor. The data-plane verbs (testConnection,
 * sync) are usually thin clients that invoke a Supabase Edge Function — the
 * function holds credentials and does the real work.
 */
export interface Connector {
  /** Stable connector id, e.g. 'google-calendar', 'plugbank'. */
  id: string
  /** Provider key matching ConnectionConfig.provider. */
  provider: string
  /** Plugin this connector extends, e.g. 'agenda', 'financial'. */
  pluginId: string
  authKind: IntegrationAuthKind
  capabilities: ConnectorCapability[]
  /** Validate the stored credentials/config without syncing. */
  testConnection?(config: ConnectionConfig): Promise<TestConnectionResult>
  /** Run a sync for the given direction; returns the audit record. */
  sync?(input: { config: ConnectionConfig; direction: SyncDirection; trigger: SyncTrigger }): Promise<SyncRun>
}

// ---------------------------------------------------------------------------
// Connector UI contract — how an addon plugin EXTENDS a host plugin's settings
// ---------------------------------------------------------------------------
// An addon plugin declares one or more ConnectorDefinitions on its manifest
// (`connectors: [...]`). The runtime groups them by `hostPluginId`, and the host
// plugin's settings panel renders them in a unified "Integrations" tab — the
// same connect/credentials experience for every connector. The connector-
// specific bits (import a statement, sync now, history) live in `ExtraPanel`.

/** A credential input the unified setup form renders for an api-key/mtls connector. */
export interface ConnectorField {
  key: string
  label: string
  type: 'text' | 'password'
  placeholder?: string
}

export interface ConnectorStatus {
  connected: boolean
  detail?: string
}

/**
 * UI-facing connector descriptor. Built on the data-plane `Connector` concept
 * (`pluginId` → `hostPluginId`), plus the control-plane hooks the unified
 * Integrations hub calls. Lives in core so `PluginManifest.connectors` can type
 * it; the rendering hub lives in `@fayz-ai/saas`.
 */
export interface ConnectorDefinition {
  /** Stable connector id, e.g. 'google-calendar', 'plugbank'. */
  id: string
  /** The plugin this connector extends, e.g. 'financial', 'agenda'. */
  hostPluginId: string
  name: string
  description?: string
  /** Lucide icon name. */
  icon?: string
  authKind: IntegrationAuthKind
  /** Declarative credentials — the unified form renders these (api-key / mtls). */
  fields?: ConnectorField[]
  /** Current connection state for the status badge. */
  getStatus(): Promise<ConnectorStatus>
  /** Validate credentials without persisting (api-key / mtls). */
  testConnection?(values: Record<string, string>): Promise<TestConnectionResult>
  /** Persist the connection (api-key / mtls). */
  saveConnection?(values: Record<string, string>): Promise<void>
  /** Begin an OAuth connect flow — returns the consent URL to redirect to. */
  startOAuth?(redirectTo?: string): Promise<string>
  /** Tear down the connection. */
  disconnect?(): Promise<void>
  /** Optional connector-specific UI below the connect panel (import / sync / history). */
  ExtraPanel?: React.ComponentType
}

/**
 * Wrap an object's async methods so a handler fires AFTER selected methods
 * resolve — the non-invasive hook for outbound, event-driven sync when there's
 * no app-level event bus. Example: wrap an AgendaDataProvider so that after
 * createBooking/updateBooking/deleteBooking succeed, an external calendar is
 * updated. The handler runs fire-and-forget; its failures never break the call.
 */
export function withAfterHooks<T extends object>(
  target: T,
  methods: Partial<Record<keyof T, (args: unknown[], result: unknown) => void | Promise<void>>>,
): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const orig = Reflect.get(obj, prop, receiver)
      const hook = (methods as Record<string | symbol, ((args: unknown[], result: unknown) => void | Promise<void>) | undefined>)[prop]
      if (typeof orig !== 'function' || !hook) return orig
      return (...args: unknown[]) => {
        const result = (orig as (...a: unknown[]) => unknown).apply(obj, args)
        if (result instanceof Promise) {
          return result.then((value) => {
            try { void Promise.resolve(hook(args, value)).catch(() => {}) } catch { /* never break the call */ }
            return value
          })
        }
        try { void Promise.resolve(hook(args, result)).catch(() => {}) } catch { /* noop */ }
        return result
      }
    },
  })
}
