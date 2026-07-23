import type { PermissionProfile } from './permissions'

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl?: string
  verticalId?: string
  plan?: string
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OrgMember {
  id: string
  userId: string
  orgId: string
  profileId: string
  profileName: string
  user: {
    id: string
    email: string
    fullName: string
    avatarUrl?: string
  }
  joinedAt: string
}

export interface OrgMembership {
  orgId: string
  orgName: string
  orgSlug: string
  orgLogoUrl?: string
  profileId: string
  profileName: string
}

/**
 * A team member in the Person-first model: a person (of a configured team kind)
 * with an OPTIONAL access overlay. `membership` is present only when the person
 * has login + RBAC role (a `tenant_members` row linked by `person_id`).
 */
export interface TeamPerson {
  personId: string
  name: string
  kind: string
  email?: string
  avatarUrl?: string
  isActive: boolean
  membership?: {
    memberId: string
    userId: string
    /** RBAC role key (tenant_members.role). */
    profileId: string
    profileName?: string
    joinedAt?: string
  }
}

export interface Location {
  id: string
  tenantId: string
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  phone?: string
  isHeadquarters: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Invite {
  id: string
  orgId: string
  email: string
  profileId: string
  profileName: string
  invitedBy: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  createdAt: string
  expiresAt: string
}

export interface CreateOrgOptions {
  verticalId?: string
  timezone?: string
  currency?: string
  locale?: string
  teamSize?: string
}

export interface OrgAdapter {
  listUserOrgs(userId: string): Promise<OrgMembership[]>
  getOrg(orgId: string): Promise<Organization>
  createOrg(name: string, userId: string, options?: CreateOrgOptions): Promise<Organization>
  updateOrg(orgId: string, data: Partial<Organization>): Promise<Organization>
  listMembers(orgId: string): Promise<OrgMember[]>
  /**
   * Person-first team list: people whose `kind` is in `personKinds`, each with an
   * optional membership overlay (login + role) linked by `tenant_members.person_id`.
   * Optional so adapters can adopt it incrementally; the Team screen falls back to
   * `listMembers` when absent or when no `personKinds` are configured.
   */
  listTeam?(orgId: string, personKinds: string[]): Promise<TeamPerson[]>
  updateMemberProfile(orgId: string, memberId: string, profileId: string): Promise<void>
  removeMember(orgId: string, memberId: string): Promise<void>
  listProfiles(orgId: string): Promise<PermissionProfile[]>
  createProfile(orgId: string, profile: Omit<PermissionProfile, 'id' | 'isSystem'>): Promise<PermissionProfile>
  updateProfile(orgId: string, profileId: string, data: Partial<PermissionProfile>): Promise<PermissionProfile>
  deleteProfile(orgId: string, profileId: string): Promise<void>
  listInvites(orgId: string): Promise<Invite[]>
  createInvite(orgId: string, email: string, profileId: string, invitedBy: string): Promise<Invite>
  bulkInvite(orgId: string, emails: string[], profileId: string, invitedBy: string): Promise<Invite[]>
  revokeInvite(orgId: string, inviteId: string): Promise<void>
  resendInvite(orgId: string, inviteId: string): Promise<Invite>
  listLocations(orgId: string): Promise<Location[]>
  createLocation(orgId: string, data: { name: string; address?: string; city?: string; state?: string; country?: string; phone?: string; isHeadquarters?: boolean }): Promise<Location>
}
