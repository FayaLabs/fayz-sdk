import type { OrgAdapter, Organization, OrgMember, OrgMembership, CreateOrgOptions } from '../../types/org-adapter'
import type { Location } from '../../types/tenant'
import type { PermissionProfile, SystemPermission, PermissionAction } from '../../types/permissions'
import type { Invite } from '../../types/invite'
import { getSupabaseClient, getCoreClient, CORE_SCHEMA } from '../supabase'

// ---------------------------------------------------------------------------
// Request dedup — prevents duplicate in-flight requests (React StrictMode, etc.)
// ---------------------------------------------------------------------------
const inflightRequests = new Map<string, Promise<any>>()

function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key)
  if (existing) return existing as Promise<T>

  const promise = fn().finally(() => {
    inflightRequests.delete(key)
  })
  inflightRequests.set(key, promise)
  return promise
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function mapTenantToOrg(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url ?? undefined,
    verticalId: row.vertical_id ?? undefined,
    plan: row.plan ?? undefined,
    settings: row.settings ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMemberRow(row: any): OrgMember {
  const profile = row.profile ?? {}
  return {
    id: row.id,
    userId: row.user_id,
    orgId: row.tenant_id,
    profileId: row.role,
    profileName: capitalize(row.role),
    user: {
      id: row.user_id,
      email: profile.email ?? '',
      fullName: profile.full_name ?? '',
      avatarUrl: profile.avatar_url ?? undefined,
    },
    joinedAt: row.joined_at,
  }
}

function mapLocationRow(row: any): Location {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    kind: row.kind ?? 'branch',
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    country: row.country ?? 'BR',
    postalCode: row.postal_code ?? undefined,
    isHeadquarters: row.is_headquarters ?? false,
    isActive: row.is_active ?? true,
    tags: row.tags ?? [],
    notes: row.notes ?? undefined,
    metadata: row.metadata ?? row.settings ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInviteRow(row: any): Invite {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role,
    locationIds: row.location_ids ?? undefined,
    invitedBy: row.invited_by,
    token: row.token,
    status: row.status ?? 'pending',
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
    createdAt: row.created_at,
    orgId: row.tenant_id,
    profileId: row.role,
    profileName: capitalize(row.role),
    invitedByName: '',
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const SYSTEM_ROLES = ['owner', 'admin', 'manager', 'staff', 'viewer'] as const

const SYSTEM_PERMISSION_MAP: Record<string, SystemPermission> = {
  'team.read': 'manage_team',
  'team.invite': 'manage_team',
  'team.manage': 'manage_team',
  'team.manage_roles': 'manage_team',
  'billing.read': 'manage_billing',
  'billing.manage': 'manage_billing',
  'settings.read': 'manage_settings',
  'settings.update': 'manage_settings',
}

const SYSTEM_CATEGORIES = new Set(['team', 'billing', 'settings'])

/**
 * Build PermissionProfile[] from DB permission data.
 * Owner gets all permissions implicitly (matches the authorize() RPC).
 */
function buildPermissionProfiles(
  permissions: { id: string; category: string }[],
  rolePerms: { role: string; permission_id: string }[],
  overrides: { role: string; permission_id: string; granted: boolean }[],
): PermissionProfile[] {
  // Build override lookup: `role:permissionId` → granted
  const overrideMap = new Map<string, boolean>()
  for (const o of overrides) {
    overrideMap.set(`${o.role}:${o.permission_id}`, o.granted)
  }

  // Build role → permission set (from defaults)
  const rolePermMap = new Map<string, Set<string>>()
  for (const role of SYSTEM_ROLES) {
    rolePermMap.set(role, new Set())
  }
  // Owner gets everything
  for (const p of permissions) {
    rolePermMap.get('owner')!.add(p.id)
  }
  for (const rp of rolePerms) {
    rolePermMap.get(rp.role)?.add(rp.permission_id)
  }

  // Apply overrides
  for (const [key, granted] of overrideMap) {
    const [role, permId] = key.split(':')
    const perms = rolePermMap.get(role)
    if (!perms) continue
    if (granted) {
      perms.add(permId)
    } else {
      perms.delete(permId)
    }
  }

  return SYSTEM_ROLES.map((role) => {
    const permIds = rolePermMap.get(role)!

    // System permissions (team/billing/settings management)
    const systemPermissions: SystemPermission[] = []
    const seenSystem = new Set<SystemPermission>()
    for (const permId of permIds) {
      const sp = SYSTEM_PERMISSION_MAP[permId]
      if (sp && !seenSystem.has(sp)) {
        seenSystem.add(sp)
        systemPermissions.push(sp)
      }
    }
    // Owner always gets all system permissions
    if (role === 'owner') {
      const allSystem: SystemPermission[] = ['manage_team', 'manage_billing', 'manage_settings', 'manage_permissions']
      for (const sp of allSystem) {
        if (!seenSystem.has(sp)) {
          seenSystem.add(sp)
          systemPermissions.push(sp)
        }
      }
    }

    // Grants: group non-system permissions by category → actions
    const grants: Record<string, PermissionAction[]> = {}
    for (const permId of permIds) {
      const perm = permissions.find((p) => p.id === permId)
      if (!perm || SYSTEM_CATEGORIES.has(perm.category)) continue

      // permId format: "category.action" e.g. "locations.read"
      const dotIdx = permId.indexOf('.')
      if (dotIdx === -1) continue
      const category = permId.slice(0, dotIdx)
      const action = permId.slice(dotIdx + 1)

      // Map DB actions to PermissionAction
      const actionMap: Record<string, PermissionAction> = {
        read: 'read',
        create: 'create',
        update: 'edit',
        manage: 'edit',
        delete: 'delete',
        configure: 'edit',
        invite: 'create',
      }
      const mappedAction = actionMap[action]
      if (!mappedAction) continue

      if (!grants[category]) grants[category] = []
      if (!grants[category].includes(mappedAction)) {
        grants[category].push(mappedAction)
      }
    }

    return {
      id: role,
      name: capitalize(role),
      isSystem: true,
      systemPermissions,
      grants,
    }
  })
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export function createSupabaseOrgAdapter(): OrgAdapter {
  const supabase = getSupabaseClient()
  /** Core-schema scoped queries */
  const core = () => supabase.schema(CORE_SCHEMA)

  return {
    async listUserOrgs(userId: string): Promise<OrgMembership[]> {
      return dedup(`listUserOrgs:${userId}`, async () => {
        const { data, error } = await core()
          .from('tenant_members')
          .select('tenant_id, role, tenant:tenants(id, name, slug, logo_url)')
          .eq('user_id', userId)

        if (error) throw error

        return (data ?? []).map((row: any) => ({
          orgId: row.tenant_id,
          orgName: row.tenant?.name ?? '',
          orgSlug: row.tenant?.slug ?? '',
          orgLogoUrl: row.tenant?.logo_url ?? undefined,
          profileId: row.role,
          profileName: capitalize(row.role),
        }))
      })
    },

    async getOrg(orgId: string): Promise<Organization> {
      const { data, error } = await core()
        .from('tenants')
        .select('*')
        .eq('id', orgId)
        .single()

      if (error) throw error
      return mapTenantToOrg(data)
    },

    async createOrg(name: string, userId: string, options?: CreateOrgOptions): Promise<Organization> {
      // Use SECURITY DEFINER RPC to create tenant + owner in one atomic operation
      // This bypasses RLS chicken-and-egg: can't SELECT tenant without membership, can't add membership without tenant ID
      const { data: tenant, error } = await supabase
        .rpc('create_tenant_with_owner', {
          p_name: name,
          p_slug: slugify(name),
          p_user_id: userId,
          p_vertical_id: options?.verticalId ?? null,
          p_plan: 'free',
          p_settings: {
            timezone: options?.timezone ?? 'America/Sao_Paulo',
            currency: options?.currency ?? 'BRL',
            locale: options?.locale ?? 'pt-BR',
            teamSize: options?.teamSize ?? undefined,
            branding: {},
          },
        })

      if (error) throw error

      // Plugin provisioning handled by Fayz platform — not per-SaaS

      return mapTenantToOrg(tenant)
    },

    async updateOrg(orgId: string, updates: Partial<Organization>): Promise<Organization> {
      const row: Record<string, unknown> = {}
      if (updates.name !== undefined) row.name = updates.name
      if (updates.slug !== undefined) row.slug = updates.slug
      if (updates.logoUrl !== undefined) row.logo_url = updates.logoUrl
      if (updates.verticalId !== undefined) row.vertical_id = updates.verticalId
      if (updates.plan !== undefined) row.plan = updates.plan
      if (updates.settings !== undefined) row.settings = updates.settings

      const { data, error } = await core()
        .from('tenants')
        .update(row)
        .eq('id', orgId)
        .select()
        .single()

      if (error) throw error
      return mapTenantToOrg(data)
    },

    async listMembers(orgId: string): Promise<OrgMember[]> {
      const { data, error } = await core()
        .from('tenant_members')
        .select('*')
        .eq('tenant_id', orgId)

      if (error) throw error

      // Fetch profiles separately (no direct FK between tenant_members and profiles)
      const userIds = (data ?? []).map((m: any) => m.user_id)
      const { data: profiles } = userIds.length > 0
        ? await core().from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
        : { data: [] }

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

      return (data ?? []).map((row: any) => {
        const profile = profileMap.get(row.user_id) ?? {}
        return mapMemberRow({ ...row, profile })
      })
    },

    async updateMemberProfile(orgId: string, memberId: string, profileId: string): Promise<void> {
      const { error } = await core()
        .from('tenant_members')
        .update({ role: profileId })
        .eq('id', memberId)
        .eq('tenant_id', orgId)

      if (error) throw error
    },

    async removeMember(orgId: string, memberId: string): Promise<void> {
      const { error } = await core()
        .from('tenant_members')
        .delete()
        .eq('id', memberId)
        .eq('tenant_id', orgId)

      if (error) throw error
    },

    async listProfiles(orgId: string): Promise<PermissionProfile[]> {
      // Fetch all permissions, default role mappings, and tenant overrides in parallel
      const [permsResult, rolePermsResult, overridesResult] = await Promise.all([
        core().from('permissions').select('id, category'),
        core().from('role_permissions').select('role, permission_id'),
        core().from('tenant_role_overrides').select('role, permission_id, granted').eq('tenant_id', orgId),
      ])

      if (permsResult.error) throw permsResult.error
      if (rolePermsResult.error) throw rolePermsResult.error
      if (overridesResult.error) throw overridesResult.error

      return buildPermissionProfiles(
        permsResult.data ?? [],
        rolePermsResult.data ?? [],
        overridesResult.data ?? [],
      )
    },

    async createProfile(_orgId: string, _profile: Omit<PermissionProfile, 'id' | 'isSystem'>): Promise<PermissionProfile> {
      throw new Error('Custom roles are not supported. Roles are system-defined (owner, admin, manager, staff, viewer).')
    },

    async updateProfile(orgId: string, profileId: string, data: Partial<PermissionProfile>): Promise<PermissionProfile> {
      // profileId is a role name — update overrides for this role
      if (data.grants) {
        // Delete existing overrides for this role, then re-insert
        await core()
          .from('tenant_role_overrides')
          .delete()
          .eq('tenant_id', orgId)
          .eq('role', profileId)

        const overrides: { tenant_id: string; role: string; permission_id: string; granted: boolean }[] = []
        for (const [category, actions] of Object.entries(data.grants)) {
          for (const action of actions) {
            const actionMap: Record<string, string> = {
              read: 'read',
              create: 'create',
              edit: 'update',
              delete: 'delete',
            }
            const dbAction = actionMap[action] ?? action
            overrides.push({
              tenant_id: orgId,
              role: profileId,
              permission_id: `${category}.${dbAction}`,
              granted: true,
            })
          }
        }

        if (overrides.length > 0) {
          const { error } = await core()
            .from('tenant_role_overrides')
            .insert(overrides)

          if (error) throw error
        }
      }

      // Re-fetch the updated profile
      const profiles = await this.listProfiles(orgId)
      const updated = profiles.find((p) => p.id === profileId)
      if (!updated) throw new Error(`Profile not found: ${profileId}`)
      return updated
    },

    async deleteProfile(_orgId: string, _profileId: string): Promise<void> {
      throw new Error('System roles cannot be deleted.')
    },

    async listInvites(orgId: string): Promise<Invite[]> {
      const { data, error } = await core()
        .from('invitations')
        .select('*')
        .eq('tenant_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map(mapInviteRow)
    },

    async createInvite(orgId: string, email: string, profileId: string, invitedBy: string): Promise<Invite> {
      const { data, error } = await core()
        .from('invitations')
        .insert({
          tenant_id: orgId,
          email,
          role: profileId,
          invited_by: invitedBy,
        })
        .select()
        .single()

      if (error) throw error
      return mapInviteRow(data)
    },

    async bulkInvite(orgId: string, emails: string[], profileId: string, invitedBy: string): Promise<Invite[]> {
      const rows = emails.map((email) => ({
        tenant_id: orgId,
        email,
        role: profileId,
        invited_by: invitedBy,
      }))

      const { data, error } = await core()
        .from('invitations')
        .insert(rows)
        .select()

      if (error) throw error
      return (data ?? []).map(mapInviteRow)
    },

    async revokeInvite(orgId: string, inviteId: string): Promise<void> {
      const { error } = await core()
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', inviteId)
        .eq('tenant_id', orgId)

      if (error) throw error
    },

    async resendInvite(orgId: string, inviteId: string): Promise<Invite> {
      const { data, error } = await core()
        .from('invitations')
        .update({
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', inviteId)
        .eq('tenant_id', orgId)
        .select()
        .single()

      if (error) throw error
      return mapInviteRow(data)
    },

    async listLocations(orgId: string): Promise<Location[]> {
      const { data, error } = await core()
        .from('locations')
        .select('*')
        .eq('tenant_id', orgId)
        .order('is_headquarters', { ascending: false })
        .order('name')

      if (error) throw error
      return (data ?? []).map(mapLocationRow)
    },

    async createLocation(orgId: string, input: { name: string; address?: string; city?: string; state?: string; country?: string; phone?: string; isHeadquarters?: boolean }): Promise<Location> {
      const { data, error } = await core()
        .from('locations')
        .insert({
          tenant_id: orgId,
          name: input.name,
          address: input.address || null,
          city: input.city || null,
          state: input.state || null,
          country: input.country || 'BR',
          phone: input.phone || null,
          is_headquarters: input.isHeadquarters ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return mapLocationRow(data)
    },
  }
}
