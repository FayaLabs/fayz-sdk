import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import type { TestConnectionResult } from '@fayz-ai/core'
import type { RankLayerIntegration, RankLayerSyncLogEntry } from '../types'

// ---------------------------------------------------------------------------
// RankLayer connector — control-plane client (SCAFFOLD).
//
// Reads/writes the connection row (plg_marketing_ranklayer_integrations) and
// reads the sync log. `testConnection` and `sync` are stubbed: RankLayer has no
// public API wired yet, so the real work (an edge function calling RankLayer)
// lands via an external PR — see ../RANKLAYER.md. Everything here is safe to
// ship: it only persists the tenant's API key + domain and surfaces status.
// ---------------------------------------------------------------------------

const INTEGRATIONS = 'plg_marketing_ranklayer_integrations'
const SYNC_LOG = 'plg_marketing_ranklayer_sync_log'

function getClient() {
  const supabase = getSupabaseClientOptional() as { from: (t: string) => any } | null
  if (!supabase) throw new Error('[ranklayer] Supabase not initialized')
  return supabase
}

function requireTenantId(): string {
  const tenantId = getActiveTenantId()
  if (!tenantId) throw new Error('[ranklayer] No active tenant')
  return tenantId
}

function toIntegration(row: Record<string, any>): RankLayerIntegration {
  return {
    id: row.id,
    apiKey: row.api_key ?? undefined,
    siteDomain: row.site_domain ?? undefined,
    active: row.active ?? true,
    lastSyncAt: row.last_sync_at ?? undefined,
  }
}

export function createRankLayerProvider() {
  return {
    async getIntegration(): Promise<RankLayerIntegration | null> {
      const tenantId = getActiveTenantId()
      if (!tenantId) return null
      const { data } = await getClient()
        .from(INTEGRATIONS)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()
      return data ? toIntegration(data) : null
    },

    async saveIntegration(values: { apiKey: string; siteDomain?: string }): Promise<RankLayerIntegration> {
      const tenantId = requireTenantId()
      const payload = {
        tenant_id: tenantId,
        api_key: values.apiKey,
        site_domain: values.siteDomain ?? null,
        active: true,
        updated_at: new Date().toISOString(),
      }
      // Upsert on the unique tenant_id.
      const { data, error } = await getClient()
        .from(INTEGRATIONS)
        .upsert(payload, { onConflict: 'tenant_id' })
        .select('*')
        .single()
      if (error) throw error
      return toIntegration(data)
    },

    async disconnect(): Promise<void> {
      const tenantId = getActiveTenantId()
      if (!tenantId) return
      await getClient().from(INTEGRATIONS).delete().eq('tenant_id', tenantId)
    },

    // SCAFFOLD: no RankLayer API yet — accept any non-empty key so the connect
    // flow can be exercised. Replace with a real credential check in the PR.
    async testConnection(values: { apiKey: string }): Promise<TestConnectionResult> {
      if (!values.apiKey || values.apiKey.trim().length < 8) {
        return { ok: false, message: 'Informe uma API Key válida da RankLayer.' }
      }
      return { ok: true, message: 'Chave aceita (validação real pendente — integração em preparação).' }
    },

    async getSyncLog(integrationId: string): Promise<RankLayerSyncLogEntry[]> {
      const { data } = await getClient()
        .from(SYNC_LOG)
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false })
        .limit(20)
      return (data ?? []).map((r: Record<string, any>) => ({
        id: r.id,
        createdAt: r.created_at,
        status: r.status,
        message: r.message ?? undefined,
        fetched: r.fetched ?? 0,
        written: r.written ?? 0,
      }))
    },
  }
}

export type RankLayerProvider = ReturnType<typeof createRankLayerProvider>
