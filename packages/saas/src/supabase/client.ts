import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { setGlobalSupabaseClient } from '@fayz-ai/core'

/** Schema name for core platform tables */
export const CORE_SCHEMA = 'saas_core'

let _client: SupabaseClient | null = null

/**
 * Create (and cache) the Supabase client for the Fayz app.
 * Also registers it as the global client in @fayz-ai/core so data providers
 * can resolve it without prop-drilling.
 *
 * Idempotent — subsequent calls with the same URL return the cached client.
 */
export function createFayzSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (_client) return _client

  if (!url || !anonKey) {
    throw new Error(
      '[@fayz-ai/saas] Supabase URL and anon key are required. ' +
        'Pass supabaseUrl and supabaseAnonKey to createFayzApp.',
    )
  }

  _client = createClient(url, anonKey, {
    auth: { autoRefreshToken: true, persistSession: true },
  })

  // Register globally so @fayz-ai/core data providers can use it
  setGlobalSupabaseClient(_client)

  return _client
}

/** Get the cached client — throws if not initialised */
export function getFayzSupabaseClient(): SupabaseClient {
  if (!_client) {
    throw new Error(
      '[@fayz-ai/saas] Supabase client not initialised. Call createFayzApp with supabaseUrl and supabaseAnonKey first.',
    )
  }
  return _client
}

/** Safe getter — returns null if not initialised (mock/offline mode) */
export function getFayzSupabaseClientOptional(): SupabaseClient | null {
  return _client
}

/** Get a client scoped to the core platform schema */
export function getCoreSchemaClient(): ReturnType<SupabaseClient['schema']> {
  return getFayzSupabaseClient().schema(CORE_SCHEMA)
}
