import React from 'react'

// ---------------------------------------------------------------------------
// MemberConfig — the declarative surface for the learner portal. Pure data so
// it round-trips through an AppManifest (defineMember ↔ MemberScaffold).
// ---------------------------------------------------------------------------

export interface MemberConfig {
  name: string
  /** Logo image URL shown in the header (falls back to the name). */
  logoUrl?: string
  locale?: string
  /** Accent color (CSS color) for the player progress + active states. */
  accent?: string
  /** Auth adapter: 'mock' (default) | 'supabase' | a bring-your-own adapter. */
  auth?: { adapter?: 'mock' | 'supabase' | unknown }
  supabaseUrl?: string
  supabaseAnonKey?: string
  /** Grant the logged-in learner every published course (demo behaviour). When
   *  false, the learner only sees the courses they were explicitly enrolled in. */
  autoEnroll?: boolean
}

export interface ResolvedMemberConfig extends MemberConfig {
  locale: string
}

export function resolveConfig(config: MemberConfig): ResolvedMemberConfig {
  return { ...config, locale: config.locale ?? 'pt-BR' }
}

const MemberConfigContext = React.createContext<ResolvedMemberConfig | null>(null)
export const MemberConfigProvider = MemberConfigContext.Provider

export function useMemberConfig(): ResolvedMemberConfig {
  const ctx = React.useContext(MemberConfigContext)
  if (!ctx) throw new Error('useMemberConfig must be used inside a MemberConfigProvider')
  return ctx
}
