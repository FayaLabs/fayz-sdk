// Shim → native Supabase client (unified singleton across shell + plugins).
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClientOptional as _getOpt } from '@fayz-ai/core'
export { createSupabaseProvider, setGlobalSupabaseClient } from '@fayz-ai/core'
// @fayz-ai/core returns a loosely-typed client (no hard supabase coupling); the
// shell does `.from(...)` against the single public client, so surface it as
// the real client type.
export const getSupabaseClientOptional = (): SupabaseClient | null =>
  _getOpt() as unknown as SupabaseClient | null
export {
  getFayzSupabaseClient as getSupabaseClient,
  getFayzSupabaseClientOptional as getSupabaseClientSafe,
  createFayzSupabaseClient as createSupabaseClient,
} from '../../supabase/client'
import { getFayzSupabaseClient } from '../../supabase/client'
// Core tables now live in the public schema — the "core" client is just the
// plain public client. Kept as a backward-compatible alias for call sites.
export const getCoreClient = getFayzSupabaseClient
export const getCoreSupabaseClient = getFayzSupabaseClient
export const getProjectSupabaseClient = getFayzSupabaseClient
export type { SupabaseClient }
