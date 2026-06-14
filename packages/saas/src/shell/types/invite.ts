export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface Invite {
  id: string
  tenantId: string
  email: string
  role: string
  locationIds?: string[]
  invitedBy: string
  token: string
  status: InviteStatus
  expiresAt: string
  acceptedAt?: string
  createdAt: string
  /** @deprecated Use tenantId */
  orgId?: string
  /** @deprecated */
  profileId?: string
  /** @deprecated */
  profileName?: string
  /** @deprecated */
  invitedByName?: string
}
