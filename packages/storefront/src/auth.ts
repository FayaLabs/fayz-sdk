import type { AuthAdapter, AuthUser } from '@fayz-ai/core'
import { createMockAuthAdapter } from '@fayz-ai/auth'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import { useSessionStore } from './stores/session.store'

// ---------------------------------------------------------------------------
// Customer auth — the SAME AuthAdapter contract createSaasApp uses, so the
// mock and Supabase adapters from @fayz-ai/auth serve both the saas admin and
// the storefront customer. The storefront adds one layer on top: linking the
// auth identity to a ShopCustomer record (find-or-create by email) so orders
// and purchase history attach to a customer.
// ---------------------------------------------------------------------------

export type StorefrontAuthAdapter = AuthAdapter | 'mock' | 'supabase'

let _adapter: AuthAdapter | null = null

export function resolveAuthAdapter(
  configured: StorefrontAuthAdapter | undefined,
): AuthAdapter {
  if (configured && configured !== 'mock' && configured !== 'supabase') return configured
  if (configured === 'supabase') {
    console.warn(
      '@fayz-ai/shop: auth.adapter="supabase" is legacy. Pass an explicit AuthAdapter or use the Fayz SDK broker path.',
    )
  }
  return createMockAuthAdapter()
}

/** Called once by createStorefrontApp. Restores any persisted session. */
export function initCustomerAuth(adapter: AuthAdapter): void {
  _adapter = adapter
  adapter
    .getSession()
    .then((existing) => {
      if (!existing) return
      const store = useSessionStore.getState()
      // Re-link only when the persisted shop session doesn't match the auth user
      if (store.email !== existing.user.email) {
        void linkCustomer(existing.user)
      }
    })
    .catch(() => {})
  adapter.onAuthStateChange((user) => {
    if (!user) useSessionStore.getState().signOut()
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
  return linkCustomer(session.user.email ? session.user : { ...session.user, email: normalized }, name)
}

export async function signOutCustomer(): Promise<void> {
  try {
    await getCustomerAuthAdapter().signOut()
  } finally {
    useSessionStore.getState().signOut()
  }
}
