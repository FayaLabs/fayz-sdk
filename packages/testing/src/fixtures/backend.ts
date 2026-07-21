// ---------------------------------------------------------------------------
// backendClient — anon + authenticated Supabase clients, the "honest
// persistence" backbone every suite uses to PROVE a UI action reached the DB.
//
//   • anon()          → identical to the client the public site instantiates
//                       (RLS / SECURITY-DEFINER gated).
//   • authed(email,pw) → password-authenticated tenant member; normal RLS-gated
//                        reads/writes for deterministic setup + best-effort
//                        teardown. NEVER the Management API.
//
// Deduped from the anonClient()/adminClient()/qaClient() copies across the 5
// suites. Connection material is read from the app's env (see ./env), so this
// works unchanged in every app.
// ---------------------------------------------------------------------------
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { envVar } from './env'

export function supabaseUrl(): string {
  const url = envVar('VITE_SUPABASE_URL', 'SUPABASE_URL')
  if (!url) {
    throw new Error('[testing] Missing Supabase URL — set VITE_SUPABASE_URL in .env')
  }
  return url
}

export function supabaseAnonKey(): string {
  const key = envVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')
  if (!key) {
    throw new Error('[testing] Missing Supabase anon key — set VITE_SUPABASE_PUBLISHABLE_KEY in .env')
  }
  return key
}

/** A backend client pair scoped to one app's Supabase pool. */
export interface BackendClient {
  /** Fresh anon client — identical to the one the public site instantiates. */
  anon(): SupabaseClient
  /** Password-authenticated client acting as a tenant member. */
  authed(email: string, password: string): Promise<SupabaseClient>
}

export function backendClient(): BackendClient {
  const url = supabaseUrl()
  const key = supabaseAnonKey()
  return {
    anon: () => createClient(url, key),
    authed: async (email, password) => {
      const sb = createClient(url, key)
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(`sign-in failed (${email}): ${error.message}`)
      return sb
    },
  }
}

// ---------------------------------------------------------------------------
// Tenant plan flip — the entitlementsContract's lever. The app reads the active
// plan from `tenants.plan` (org adapter → org.plan → the access engine's cap
// resolver), so an authenticated UPDATE here + a page reload re-hydrates the org
// with the new plan. This is exactly what `adapter.updateOrg(orgId, { plan })`
// does under the hood — same RLS-gated write, no Management API. The contract
// captures the original plan (getTenantPlan) before flipping and ALWAYS restores
// it in a finally/afterAll so a run never leaves the tenant on the QA plan.
// ---------------------------------------------------------------------------

/** Read a tenant's current `plan` id (null when the column is empty). */
export async function getTenantPlan(sb: SupabaseClient, tenantId: string): Promise<string | null> {
  const { data, error } = await sb.from('tenants').select('plan').eq('id', tenantId).single()
  if (error) throw new Error(`getTenantPlan(${tenantId}): ${error.message}`)
  return ((data as { plan?: string | null } | null)?.plan ?? null)
}

/** Flip a tenant's active plan (writes `tenants.plan`, RLS-gated as the owner). */
export async function setTenantPlan(sb: SupabaseClient, tenantId: string, planId: string): Promise<void> {
  const { error } = await sb.from('tenants').update({ plan: planId }).eq('id', tenantId)
  if (error) throw new Error(`setTenantPlan(${tenantId} → ${planId}): ${error.message}`)
}

/** Tenant-scoped row count (proof an entity did/didn't reach the DB). Mirrors the
 *  access engine's `countByTenant` but as an authenticated read for the suite. */
export async function countTenantRows(
  sb: SupabaseClient,
  table: string,
  tenantId: string,
  opts: { kind?: string; nameColumn?: string; namePrefix?: string } = {},
): Promise<number> {
  let q = sb.from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
  if (opts.kind) q = q.eq('kind', opts.kind)
  if (opts.nameColumn && opts.namePrefix) q = q.ilike(opts.nameColumn, `${opts.namePrefix}%`)
  const { count, error } = await q
  if (error) throw new Error(`countTenantRows(${table}): ${error.message}`)
  return count ?? 0
}

export type { SupabaseClient }
