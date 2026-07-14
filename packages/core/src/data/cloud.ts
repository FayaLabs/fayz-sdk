// ---------------------------------------------------------------------------
// Fayz Cloud — the shared multi-tenant Supabase project ("FayzApi") backing
// Fayz-hosted modules (calendar, shop, …). Stripe-style default: the SDK
// knows the product endpoint, apps only supply identity (tenantId).
//
// (Not to be confused with createFayzApiProvider in ./platform-api, which
// talks to the fayz.ai builder's runtime CRUD API.)
//
// The key here is the PUBLISHABLE (anon) key — public by design: every anon
// path goes through column-whitelisted views and SECURITY DEFINER RPCs with
// server-side validation, and RLS isolates tenants. Apps that bring their own
// backend override via setGlobalSupabaseClient (or a per-plugin dataProvider)
// and never touch this client.
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js'

// TODO: flip to https://api.fayz.ai once the custom-domain SSL validates
// (pending _acme-challenge TXT record as of 2026-07-14).
export const FAYZ_CLOUD_URL = 'https://yfxutrkyhydgltakbqle.supabase.co'
export const FAYZ_CLOUD_PUBLISHABLE_KEY = 'sb_publishable_v8rbvLDgnq5IbkVB5B6LxQ_D62mfPZX'

let _client: unknown | null = null

/** Lazy singleton client for Fayz Cloud (the shared hosted backend). */
export function getFayzCloudClient(): unknown {
  if (!_client) _client = createClient(FAYZ_CLOUD_URL, FAYZ_CLOUD_PUBLISHABLE_KEY)
  return _client
}
