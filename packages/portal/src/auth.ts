import type { AuthAdapter, AuthUser } from '@fayz-ai/core'
import { createMockAuthAdapter, createSupabaseAuthAdapter } from '@fayz-ai/auth'
import { getCoursesProvider } from '@fayz-ai/courses'
import { useMemberSession } from './session'

// ---------------------------------------------------------------------------
// Learner auth — the SAME AuthAdapter contract the admin + storefront use. On
// top of the auth identity, the portal derives a stable customerId (the key
// enrollments/progress hang off) and, in demo mode, grants the learner every
// published course (so any login lands in a populated "my courses").
// ---------------------------------------------------------------------------

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Deterministic learner id from an email, so the same login always maps to the
 *  same enrollments/progress across reloads. */
export function customerIdForEmail(email: string): string {
  return `cust-${slug(email.trim().toLowerCase())}`
}

let _adapter: AuthAdapter | null = null
let _autoEnroll = true

export function resolveAuthAdapter(
  configured: unknown,
  supabase?: { url?: string; anonKey?: string },
): AuthAdapter {
  if (configured && configured !== 'mock' && configured !== 'supabase') return configured as AuthAdapter
  if (configured === 'supabase' && supabase?.url && supabase?.anonKey) {
    return createSupabaseAuthAdapter({ supabaseUrl: supabase.url, supabaseAnonKey: supabase.anonKey })
  }
  return createMockAuthAdapter()
}

export function initMemberAuth(adapter: AuthAdapter, opts?: { autoEnroll?: boolean }): void {
  _adapter = adapter
  _autoEnroll = opts?.autoEnroll ?? true
  adapter
    .getSession()
    .then((existing) => {
      if (existing) void link(existing.user)
    })
    .catch(() => {})
  adapter.onAuthStateChange((user) => {
    if (!user) useMemberSession.getState().signOut()
  })
}

function getAdapter(): AuthAdapter {
  if (!_adapter) _adapter = createMockAuthAdapter()
  return _adapter
}

/** Enroll the learner in every published course — demo entitlement. Idempotent. */
async function grantAllPublished(customerId: string): Promise<void> {
  const provider = getCoursesProvider()
  const courses = await provider.listCourses({ status: 'published' })
  for (const c of courses) await provider.enroll(c.id, customerId)
}

async function link(user: AuthUser, fullName?: string): Promise<{ customerId: string }> {
  const email = (user.email ?? '').trim().toLowerCase()
  const customerId = customerIdForEmail(email)
  if (_autoEnroll) await grantAllPublished(customerId)
  useMemberSession.getState().setSession({ customerId, email, name: fullName ?? user.fullName ?? null })
  return { customerId }
}

export async function establishMemberSession(
  email: string,
  opts?: { password?: string; name?: string },
): Promise<{ customerId: string }> {
  const adapter = getAdapter()
  const normalized = email.trim().toLowerCase()
  const session = opts?.password
    ? await adapter.signIn(normalized, opts.password)
    : await adapter.signUp(normalized, `member-${normalized}`, opts?.name ?? '')
  const user = session.user.email ? session.user : { ...session.user, email: normalized }
  return link(user, opts?.name)
}

export async function signUpMember(email: string, password: string, name: string): Promise<{ customerId: string }> {
  const adapter = getAdapter()
  const normalized = email.trim().toLowerCase()
  const session = await adapter.signUp(normalized, password, name)
  const user = session.user.email ? session.user : { ...session.user, email: normalized }
  return link(user, name)
}

export async function signOutMember(): Promise<void> {
  try {
    await getAdapter().signOut()
  } finally {
    useMemberSession.getState().signOut()
  }
}
