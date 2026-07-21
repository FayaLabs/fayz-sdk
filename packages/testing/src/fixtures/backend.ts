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

export type { SupabaseClient }
