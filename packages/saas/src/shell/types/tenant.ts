export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl?: string
  settings: TenantSettings
  plan: string
  verticalId?: string
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: string
  tenantId: string
  kind: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country: string
  postalCode?: string
  isHeadquarters: boolean
  isActive: boolean
  tags: string[]
  notes?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface LocationMember {
  id: string
  locationId: string
  userId: string
  role: string
  isPrimary: boolean
  createdAt: string
}

export interface TenantSettings {
  timezone: string
  currency: string
  locale: string
  branding: {
    primaryColor?: string
    accentColor?: string
    logoUrl?: string
    faviconUrl?: string
  }
  fieldRules?: import('./crud').TenantFieldRules
}

export type MemberRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'

export interface TenantMember {
  id: string
  userId: string
  tenantId: string
  role: MemberRole
  profileId?: string
  profileName?: string
  user: {
    id: string
    email: string
    fullName: string
    avatarUrl?: string
  }
  joinedAt: string
}

export interface TenantState {
  tenant: Tenant | null
  members: TenantMember[]
  currentRole: MemberRole | null
  loading: boolean
}
