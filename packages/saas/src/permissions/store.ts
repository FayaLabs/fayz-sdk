import { create } from 'zustand'
import type { FeatureDeclaration, PermissionProfile } from '@fayz/core'

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface PermissionsStore {
  features: FeatureDeclaration[]
  profiles: PermissionProfile[]
  /** The effective profile used for permission checks (may be impersonated) */
  currentProfile: PermissionProfile | null
  /** The user's actual profile (preserved during impersonation) */
  realProfile: PermissionProfile | null
  /** The profile being previewed, if any */
  impersonatedProfile: PermissionProfile | null
  /** Whether impersonation is active */
  isImpersonating: boolean

  setFeatures: (features: FeatureDeclaration[]) => void
  setProfiles: (profiles: PermissionProfile[]) => void
  setCurrentProfile: (profile: PermissionProfile | null) => void
  startImpersonation: (profile: PermissionProfile) => void
  stopImpersonation: () => void
  reset: () => void
}

export const usePermissionsStore = create<PermissionsStore>((set, get) => ({
  features: [],
  profiles: [],
  currentProfile: null,
  realProfile: null,
  impersonatedProfile: null,
  isImpersonating: false,

  setFeatures: (features) => set({ features }),
  setProfiles: (profiles) => set({ profiles }),
  setCurrentProfile: (profile) =>
    set({
      currentProfile: profile,
      realProfile: profile,
      impersonatedProfile: null,
      isImpersonating: false,
    }),
  startImpersonation: (profile) =>
    set({
      currentProfile: profile,
      impersonatedProfile: profile,
      isImpersonating: true,
    }),
  stopImpersonation: () => {
    const { realProfile } = get()
    set({
      currentProfile: realProfile,
      impersonatedProfile: null,
      isImpersonating: false,
    })
  },
  reset: () =>
    set({
      features: [],
      profiles: [],
      currentProfile: null,
      realProfile: null,
      impersonatedProfile: null,
      isImpersonating: false,
    }),
}))
