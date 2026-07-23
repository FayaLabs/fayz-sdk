import type { AuthAdapter, AuthUser } from '@fayz-ai/core'
import {
  createAuthRuntime,
  createMockAuthAdapter,
  type AuthPluginOptions,
} from '@fayz-ai/plugin-auth'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import { setShopAccessTokenResolver } from '@fayz-ai/sdk/shop'
import { useSessionStore } from './stores/session.store'

// ---------------------------------------------------------------------------
// Customer auth — the SAME AuthAdapter contract createSaasApp uses, so the
// mock and Supabase adapters from @fayz-ai/auth serve both the saas admin and
// the storefront customer. The storefront adds one layer on top: linking the
// auth identity to a ShopCustomer record (find-or-create by email) so orders
// and purchase history attach to a customer.
// ---------------------------------------------------------------------------

export type StorefrontAuthAdapter = AuthAdapter | 'mock' | 'supabase' | (string & {})

export interface StorefrontAuthConfig {
  adapter?: AuthPluginOptions['adapter']
  provider?: AuthPluginOptions['provider']
  routes?: AuthPluginOptions['routes']
  supabase?: AuthPluginOptions['supabase']
}

let _adapter: AuthAdapter | null = null

function isAuthAdapter(value: unknown): value is AuthAdapter {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'getSession' in value &&
      'signIn' in value &&
      'signOut' in value,
  )
}

function normalizeAuthConfig(
  configured: StorefrontAuthAdapter | StorefrontAuthConfig | undefined,
): StorefrontAuthConfig {
  if (!configured) return {}
  if (typeof configured === 'string' || isAuthAdapter(configured)) return { adapter: configured }
  return configured
}

export function resolveAuthAdapter(
  configured: StorefrontAuthAdapter | StorefrontAuthConfig | undefined,
  fallback?: { supabaseUrl?: string; supabaseAnonKey?: string },
): AuthAdapter {
  const config = normalizeAuthConfig(configured)
  return createAuthRuntime({
    provider: config.provider ?? config.adapter ?? (fallback?.supabaseUrl ? 'supabase' : 'mock'),
    adapter: config.adapter,
    routes: config.routes,
    requireAuth: false,
    supabase: {
      url: config.supabase?.url ?? fallback?.supabaseUrl,
      anonKey: config.supabase?.anonKey ?? fallback?.supabaseAnonKey,
      client: config.supabase?.client,
      callbackUrl: config.supabase?.callbackUrl,
      resetPasswordUrl: config.supabase?.resetPasswordUrl,
    },
  }).adapter
}

// The shopper's current access token, handed to the shop REST client so its
// requests reach PostgREST as the signed-in user instead of as `anon`. Held
// here rather than in the session store because it is a credential: it must not
// be persisted to localStorage alongside the customer id. The Supabase client
// owns its own refresh; this is only a mirror of the live value.
let _accessToken: string | null = null

/** Whether an authenticated identity was ever seen this session. Distinguishes
 *  "signed out" from "was never signed in" — see the onAuthStateChange guard. */
let _hadAuthUser = false

/** Refresh the mirrored token from the adapter. Safe to call on any event. */
async function syncAccessToken(adapter: AuthAdapter): Promise<void> {
  try {
    const existing = await adapter.getSession()
    _accessToken = existing?.session.accessToken ?? null
  } catch {
    _accessToken = null
  }
}

/** Called once by createStorefrontApp. Restores any persisted session. */
export function initCustomerAuth(adapter: AuthAdapter): void {
  _adapter = adapter

  // Registered before the first await so no request can slip out anonymously
  // while the session is still being restored.
  setShopAccessTokenResolver(() => _accessToken)

  adapter
    .getSession()
    .then((existing) => {
      _accessToken = existing?.session.accessToken ?? null
      if (!existing) return
      _hadAuthUser = true
      const store = useSessionStore.getState()
      // Re-link only when the persisted shop session doesn't match the auth user
      if (store.email !== existing.user.email) {
        void linkCustomer(existing.user)
      }
    })
    .catch(() => {})

  adapter.onAuthStateChange((user) => {
    if (!user) {
      _accessToken = null
      // Only tear down the shop session if there WAS an authenticated identity
      // to lose. The Supabase adapter fires this once on boot with a null user
      // (INITIAL_SESSION), and clearing unconditionally wiped the guest's local
      // session on every page load — a guest who checked out could no longer
      // find their order after a reload. The mock adapter never surfaced this
      // because it always restored a session.
      if (_hadAuthUser) {
        _hadAuthUser = false
        useSessionStore.getState().signOut()
      }
      return
    }
    _hadAuthUser = true
    // Covers token refresh too, not just sign-in: the callback carries the user
    // but not the token, and a stale token would 401 every read an hour in.
    void syncAccessToken(adapter)
  })
}

export function getCustomerAuthAdapter(): AuthAdapter {
  if (!_adapter) _adapter = createMockAuthAdapter()
  return _adapter
}

/** Resolve (find-or-create + server-side auth link) the ShopCustomer for an email. */
async function resolveShopCustomer(email: string, name: string) {
  const provider = getShopProvider()
  // Preferred: provider.resolveCustomer find-or-creates AND links auth.uid
  // server-side (RLS-safe). Falls back to generic CRUD for legacy providers.
  if (provider.resolveCustomer) return provider.resolveCustomer({ email, name })
  const matches = await provider.listCustomers({ search: email, limit: 10 })
  const existing = matches.find((c) => (c.email ?? '').toLowerCase() === email)
  if (existing) return existing
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return provider.createCustomer({
    firstName: parts[0] ?? email.split('@')[0] ?? 'Cliente',
    lastName: parts.slice(1).join(' '),
    email,
  })
}

/** Find-or-create the ShopCustomer for an auth identity and persist the session. */
async function linkCustomer(user: AuthUser, fullName?: string): Promise<{ customerId: string }> {
  const email = (user.email ?? '').trim().toLowerCase()
  const name = fullName ?? user.fullName ?? ''
  const customer = await resolveShopCustomer(email, name)
  useSessionStore.getState().setSession({
    customerId: customer.id,
    email,
    name: name || `${customer.firstName} ${customer.lastName}`.trim(),
  })
  return { customerId: customer.id }
}

export interface EstablishSessionOptions {
  /** Provided → adapter.signIn; omitted → passwordless customer identity via signUp (mock-friendly). */
  password?: string
  name?: string
}

/**
 * Sign a customer in through the auth adapter and link the ShopCustomer.
 * Used by the account page sign-in AND by checkout (so a buyer is signed in
 * for "my purchases" immediately after purchase) — one auth path, two doors.
 */
export async function establishCustomerSession(
  email: string,
  opts?: EstablishSessionOptions,
): Promise<{ customerId: string }> {
  const normalized = email.trim().toLowerCase()
  if (opts?.password) {
    const adapter = getCustomerAuthAdapter()
    const session = await adapter.signIn(normalized, opts.password)
    // Before linkCustomer, not after: linkCustomer calls shop_resolve_customer,
    // which reads auth.uid() to fill auth_user_id. Sent with the old token that
    // link silently no-ops and the account stays unlinked forever.
    _accessToken = session.accessToken ?? null
    _hadAuthUser = true
    return linkCustomer(session.user.email ? session.user : { ...session.user, email: normalized }, opts.name)
  }
  // Guest / passwordless checkout: do NOT create an auth account (that made
  // returning guests fail with "user already registered" on Supabase). Just
  // resolve the ShopCustomer and persist the local session for order history.
  return linkCustomer({ id: '', email: normalized } as AuthUser, opts?.name)
}

/** Convenience wrapper — passwordless email sign-in (guest checkout path). */
export function signInByEmail(email: string, name?: string): Promise<{ customerId: string }> {
  return establishCustomerSession(email, { name })
}

/** Explicit account creation (account page "Criar conta" form). */
export async function signUpCustomer(
  email: string,
  password: string,
  name: string,
): Promise<{ customerId: string }> {
  const adapter = getCustomerAuthAdapter()
  const normalized = email.trim().toLowerCase()
  const session = await adapter.signUp(normalized, password, name)
  _accessToken = session.accessToken ?? null
  _hadAuthUser = true
  return linkCustomer(session.user.email ? session.user : { ...session.user, email: normalized }, name)
}

export async function signOutCustomer(): Promise<void> {
  try {
    await getCustomerAuthAdapter().signOut()
  } finally {
    _accessToken = null
    _hadAuthUser = false
    useSessionStore.getState().signOut()
  }
}
