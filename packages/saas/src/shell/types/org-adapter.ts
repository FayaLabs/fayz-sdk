import type { PermissionProfile } from './permissions'
import type { Invite } from './invite'
import type { Location } from './tenant'

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

export interface CreateOrgOptions {
  verticalId?: string
  timezone?: string
  currency?: string
  locale?: string
  teamSize?: string
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

/** Person-first team member: a person of a team kind + optional access overlay. */
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
    profileId: string
    profileName?: string
    joinedAt?: string
  }
}

export interface OrgAdapter {
  listUserOrgs(userId: string): Promise<OrgMembership[]>
  getOrg(orgId: string): Promise<Organization>
  createOrg(name: string, userId: string, options?: CreateOrgOptions): Promise<Organization>
  updateOrg(orgId: string, data: Partial<Organization>): Promise<Organization>

  listMembers(orgId: string): Promise<OrgMember[]>
  /** Person-first team list (people of `personKinds` + optional membership). Optional; falls back to listMembers. */
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
