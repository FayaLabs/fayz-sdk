import type { OrgAdapter, Organization, OrgMember, OrgMembership, CreateOrgOptions } from '../../types/org-adapter'
import type { PermissionProfile } from '../../types/permissions'
import type { Invite } from '../../types/invite'
import type { TenantSettings, Location } from '../../types/tenant'

const STORAGE_KEY = 'saas-core:mock-orgs'

interface MockOrgData {
  orgs: Organization[]
  members: OrgMember[]
  profiles: Record<string, PermissionProfile[]> // orgId → profiles
  invites: Record<string, Invite[]> // orgId → invites
  userOrgMap: Record<string, string[]> // userId → orgIds
}

function getStored(): MockOrgData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return { orgs: [], members: [], profiles: {}, invites: {}, userOrgMap: {} }
}

function setStored(data: MockOrgData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function createDefaultSettings(options?: CreateOrgOptions): TenantSettings {
  return {
    timezone: options?.timezone ?? 'America/Sao_Paulo',
    currency: options?.currency ?? 'BRL',
    locale: options?.locale ?? 'pt-BR',
    branding: {},
  }
}

export function createMockOrgAdapter(defaultProfiles?: PermissionProfile[]): OrgAdapter {
  function seedOrgForUser(userId: string, userName?: string): MockOrgData {
    const data = getStored()
    if (data.userOrgMap[userId]?.length) return data

    const orgId = crypto.randomUUID()
    const memberId = crypto.randomUUID()
    const firstProfile = defaultProfiles?.[0]

    const org: Organization = {
      id: orgId,
      name: 'My Organization',
      slug: 'my-organization',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const member: OrgMember = {
      id: memberId,
      userId,
      orgId,
      profileId: firstProfile?.id ?? 'owner',
      profileName: firstProfile?.name ?? 'Owner',
      user: {
        id: userId,
        email: userName ? `${userName.toLowerCase().replace(/\s/g, '.')}@example.com` : 'user@example.com',
        fullName: userName ?? 'Current User',
      },
      joinedAt: new Date().toISOString(),
    }

    data.orgs.push(org)
    data.members.push(member)
    data.userOrgMap[userId] = [orgId]
    if (defaultProfiles) {
      data.profiles[orgId] = [...defaultProfiles]
    }
    data.invites[orgId] = []

    setStored(data)
    return data
  }

  return {
    async listUserOrgs(userId: string): Promise<OrgMembership[]> {
      const data = seedOrgForUser(userId)
      const orgIds = data.userOrgMap[userId] ?? []
      return orgIds.map((orgId) => {
        const org = data.orgs.find((o) => o.id === orgId)!
        const member = data.members.find((m) => m.orgId === orgId && m.userId === userId)
        return {
          orgId,
          orgName: org.name,
          orgSlug: org.slug,
          orgLogoUrl: org.logoUrl,
          profileId: member?.profileId ?? 'owner',
          profileName: member?.profileName ?? 'Owner',
        }
      })
    },

    async getOrg(orgId: string): Promise<Organization> {
      const data = getStored()
      const org = data.orgs.find((o) => o.id === orgId)
      if (!org) throw new Error(`Org not found: ${orgId}`)
      return org
    },

    async createOrg(name: string, userId: string, options?: CreateOrgOptions): Promise<Organization> {
      const data = getStored()
      const orgId = crypto.randomUUID()
      const firstProfile = defaultProfiles?.[0]

      const org: Organization = {
        id: orgId,
        name,
        slug: slugify(name),
        verticalId: options?.verticalId,
        plan: 'free',
        settings: createDefaultSettings(options) as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const member: OrgMember = {
        id: crypto.randomUUID(),
        userId,
        orgId,
        profileId: firstProfile?.id ?? 'owner',
        profileName: firstProfile?.name ?? 'Owner',
        user: {
          id: userId,
          email: 'user@example.com',
          fullName: 'Current User',
        },
        joinedAt: new Date().toISOString(),
      }

      data.orgs.push(org)
      data.members.push(member)
      if (!data.userOrgMap[userId]) data.userOrgMap[userId] = []
      data.userOrgMap[userId].push(orgId)
      if (defaultProfiles) {
        data.profiles[orgId] = [...defaultProfiles]
      }
      data.invites[orgId] = []

      setStored(data)
      return org
    },

    async updateOrg(orgId: string, updates: Partial<Organization>): Promise<Organization> {
      const data = getStored()
      const idx = data.orgs.findIndex((o) => o.id === orgId)
      if (idx === -1) throw new Error(`Org not found: ${orgId}`)
      data.orgs[idx] = { ...data.orgs[idx], ...updates, updatedAt: new Date().toISOString() }
      setStored(data)
      return data.orgs[idx]
    },

    async listMembers(orgId: string): Promise<OrgMember[]> {
      const data = getStored()
      return data.members.filter((m) => m.orgId === orgId)
    },

    async updateMemberProfile(orgId: string, memberId: string, profileId: string): Promise<void> {
      const data = getStored()
      const member = data.members.find((m) => m.id === memberId && m.orgId === orgId)
      if (!member) throw new Error(`Member not found: ${memberId}`)
      const profiles = data.profiles[orgId] ?? []
      const profile = profiles.find((p) => p.id === profileId)
      member.profileId = profileId
      member.profileName = profile?.name ?? profileId
      setStored(data)
    },

    async removeMember(orgId: string, memberId: string): Promise<void> {
      const data = getStored()
      const memberIdx = data.members.findIndex((m) => m.id === memberId && m.orgId === orgId)
      if (memberIdx === -1) return
      const member = data.members[memberIdx]
      data.members.splice(memberIdx, 1)
      // Remove org from user's org map
      const userOrgs = data.userOrgMap[member.userId]
      if (userOrgs) {
        const orgIdx = userOrgs.indexOf(orgId)
        if (orgIdx !== -1) userOrgs.splice(orgIdx, 1)
      }
      setStored(data)
    },

    async listProfiles(orgId: string): Promise<PermissionProfile[]> {
      const data = getStored()
      return data.profiles[orgId] ?? defaultProfiles ?? []
    },

    async createProfile(orgId: string, profile: Omit<PermissionProfile, 'id' | 'isSystem'>): Promise<PermissionProfile> {
      const data = getStored()
      const newProfile: PermissionProfile = {
        ...profile,
        id: crypto.randomUUID(),
        isSystem: false,
      }
      if (!data.profiles[orgId]) data.profiles[orgId] = defaultProfiles ? [...defaultProfiles] : []
      data.profiles[orgId].push(newProfile)
      setStored(data)
      return newProfile
    },

    async updateProfile(orgId: string, profileId: string, updates: Partial<PermissionProfile>): Promise<PermissionProfile> {
      const data = getStored()
      const profiles = data.profiles[orgId] ?? []
      const idx = profiles.findIndex((p) => p.id === profileId)
      if (idx === -1) throw new Error(`Profile not found: ${profileId}`)
      profiles[idx] = { ...profiles[idx], ...updates }
      data.profiles[orgId] = profiles
      setStored(data)
      return profiles[idx]
    },

    async deleteProfile(orgId: string, profileId: string): Promise<void> {
      const data = getStored()
      const profiles = data.profiles[orgId] ?? []
      const profile = profiles.find((p) => p.id === profileId)
      if (profile?.isSystem) throw new Error('Cannot delete system profile')
      data.profiles[orgId] = profiles.filter((p) => p.id !== profileId)
      setStored(data)
    },

    async listInvites(orgId: string): Promise<Invite[]> {
      const data = getStored()
      return data.invites[orgId] ?? []
    },

    async createInvite(orgId: string, email: string, profileId: string, invitedBy: string): Promise<Invite> {
      const data = getStored()
      const profiles = data.profiles[orgId] ?? defaultProfiles ?? []
      const profile = profiles.find((p) => p.id === profileId)
      const inviter = data.members.find((m) => m.userId === invitedBy)

      const invite: Invite = {
        id: crypto.randomUUID(),
        tenantId: orgId,
        orgId,
        email,
        role: 'staff',
        token: crypto.randomUUID(),
        profileId,
        profileName: profile?.name ?? profileId,
        invitedBy,
        invitedByName: inviter?.user.fullName ?? 'Unknown',
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      if (!data.invites[orgId]) data.invites[orgId] = []
      data.invites[orgId].push(invite)
      setStored(data)
      return invite
    },

    async bulkInvite(orgId: string, emails: string[], profileId: string, invitedBy: string): Promise<Invite[]> {
      const results: Invite[] = []
      for (const email of emails) {
        results.push(await this.createInvite(orgId, email, profileId, invitedBy))
      }
      return results
    },

    async revokeInvite(orgId: string, inviteId: string): Promise<void> {
      const data = getStored()
      const invites = data.invites[orgId] ?? []
      const invite = invites.find((i) => i.id === inviteId)
      if (invite) {
        invite.status = 'revoked'
        setStored(data)
      }
    },

    async resendInvite(orgId: string, inviteId: string): Promise<Invite> {
      const data = getStored()
      const invites = data.invites[orgId] ?? []
      const invite = invites.find((i) => i.id === inviteId)
      if (!invite) throw new Error(`Invite not found: ${inviteId}`)
      invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      invite.status = 'pending'
      setStored(data)
      return invite
    },

    async listLocations(_orgId: string): Promise<Location[]> {
      return []
    },

    async createLocation(_orgId: string, data: any): Promise<Location> {
      return {
        id: crypto.randomUUID(),
        tenantId: _orgId,
        kind: 'branch',
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country ?? 'BR',
        phone: data.phone,
        isHeadquarters: data.isHeadquarters ?? false,
        isActive: true,
        tags: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
  }
}
