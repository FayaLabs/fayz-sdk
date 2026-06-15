// Shim → native Supabase client (unified singleton across shell + plugins).
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClientOptional as _getOpt } from '@fayz-ai/core'
export { createSupabaseProvider, setGlobalSupabaseClient } from '@fayz-ai/core'
// @fayz-ai/core returns a loosely-typed client (no hard supabase coupling); the
// shell does `.schema(...).from(...)`, so surface it as the real client type.
export const getSupabaseClientOptional = (): SupabaseClient | null =>
  _getOpt() as unknown as SupabaseClient | null
export {
  CORE_SCHEMA,
  getCoreSchemaClient as getCoreClient,
  getFayzSupabaseClient as getSupabaseClient,
  getFayzSupabaseClientOptional as getSupabaseClientSafe,
  createFayzSupabaseClient as createSupabaseClient,
} from '../../supabase/client'
import { getFayzSupabaseClient } from '../../supabase/client'
export const getCoreSupabaseClient = getFayzSupabaseClient
export const getProjectSupabaseClient = getFayzSupabaseClient
export type { SupabaseClient }
