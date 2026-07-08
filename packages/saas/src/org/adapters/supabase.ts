import type {
  OrgAdapter,
  Organization,
  OrgMember,
  OrgMembership,
  CreateOrgOptions,
  Location,
  Invite,
} from '@fayz-ai/core'
import type { PermissionProfile, SystemPermission, AuthAdapter } from '@fayz-ai/core'
import { getFayzSupabaseClient, CORE_SCHEMA } from '../../supabase/client'

// ---------------------------------------------------------------------------
// Request dedup — prevents duplicate in-flight requests (React StrictMode etc.)
// ---------------------------------------------------------------------------

const inflightRequests = new Map<string, Promise<unknown>>()

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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mapTenantToOrg(row: Record<string, unknown>): Organization {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    slug: row['slug'] as string,
    logoUrl: (row['logo_url'] as string | null) ?? undefined,
    verticalId: (row['vertical_id'] as string | null) ?? undefined,
    plan: (row['plan'] as string | null) ?? undefined,
    settings: (row['settings'] as Record<string, unknown> | null) ?? undefined,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  }
}

function mapMemberRow(row: Record<string, unknown>): OrgMember {
  const profile = (row['profile'] as Record<string, unknown>) ?? {}
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    orgId: row['tenant_id'] as string,
    profileId: row['role'] as string,
    profileName: capitalize(row['role'] as string),
    user: {
      id: row['user_id'] as string,
      email: (profile['email'] as string) ?? '',
      fullName: (profile['full_name'] as string) ?? '',
      avatarUrl: (profile['avatar_url'] as string | null) ?? undefined,
    },
    // tenant_members has no `joined_at` column — it's `created_at`.
    joinedAt: (row['joined_at'] ?? row['created_at']) as string,
  }
}

function mapLocationRow(row: Record<string, unknown>): Location {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    name: row['name'] as string,
    address: (row['address'] as string | null) ?? undefined,
    city: (row['city'] as string | null) ?? undefined,
    state: (row['state'] as string | null) ?? undefined,
    country: (row['country'] as string | null) ?? undefined,
    phone: (row['phone'] as string | null) ?? undefined,
    isHeadquarters: (row['is_headquarters'] as boolean) ?? false,
    isActive: (row['is_active'] as boolean) ?? true,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  }
}

function mapInviteRow(row: Record<string, unknown>): Invite {
  return {
    id: row['id'] as string,
    orgId: row['tenant_id'] as string,
    email: row['email'] as string,
    profileId: row['role'] as string,
    profileName: capitalize(row['role'] as string),
    invitedBy: row['invited_by'] as string,
    token: row['token'] as string,
    status: (row['status'] as Invite['status']) ?? 'pending',
    createdAt: row['created_at'] as string,
    expiresAt: row['expires_at'] as string,
  }
}

/** Minimal role identity the adapter needs to build profiles. Grants come from
 *  the DB catalog; id/name/order/description come from what the app declares. */
export interface RoleIdentity {
  id: string
  name: string
  description?: string
  /** System roles are app-defined and static (not user-editable). Custom roles
   *  (duplicated by users, stored in tenant_roles) are false. Defaults true. */
  isSystem?: boolean
}

// Matrix emits read/create/edit/delete; map back to DB action verbs.
const DB_ACTION: Record<string, string> = {
  read: 'read', create: 'create', edit: 'update', write: 'create', manage: 'manage', delete: 'delete',
}

function slugifyRole(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'role'
}

// Fallback role set when the host app declares none. The SDK is domain-agnostic:
// each app defines its OWN business roles (a salon's roles ≠ an agency's) via
// config.permissions.defaultProfiles. These five are only a back-compat default.
const DEFAULT_ROLES: RoleIdentity[] = [
  { id: 'owner', name: 'Owner' },
  { id: 'admin', name: 'Admin' },
  { id: 'manager', name: 'Manager' },
  { id: 'staff', name: 'Staff' },
  { id: 'viewer', name: 'Viewer' },
]

// DB permission ids that confer an org-management system permission.
const SYSTEM_PERMISSION_MAP: Record<string, SystemPermission> = {
  'team.read': 'manage_team',
  'team.invite': 'manage_team',
  'team.manage': 'manage_team',
  'team.manage_roles': 'manage_permissions',
  'billing.read': 'manage_billing',
  'billing.manage': 'manage_billing',
  'settings.read': 'manage_settings',
  'settings.update': 'manage_settings',
}
const ALL_SYSTEM_PERMISSIONS: SystemPermission[] = ['manage_team', 'manage_billing', 'manage_settings', 'manage_permissions']

// Map DB permission ids to feature action grants
function buildPermissionProfiles(
  roles: RoleIdentity[],
  permissions: Array<{ id: string; category: string }>,
  rolePerms: Array<{ role: string; permission_id: string }>,
  overrides: Array<{ role: string; permission_id: string; granted: boolean }>,
): PermissionProfile[] {
  const overrideMap = new Map<string, boolean>()
  for (const o of overrides) {
    overrideMap.set(`${o.role}:${o.permission_id}`, o.granted)
  }

  // The role SET comes from what the app declares — the SDK no longer bakes it in.
  const rolePermMap = new Map<string, Set<string>>()
  for (const r of roles) {
    rolePermMap.set(r.id, new Set())
  }
  // Convention: an 'owner' role (if declared) gets every permission implicitly.
  if (rolePermMap.has('owner')) {
    for (const p of permissions) rolePermMap.get('owner')!.add(p.id)
  }
  for (const rp of rolePerms) {
    rolePermMap.get(rp.role)?.add(rp.permission_id)
  }

  // Apply overrides
  for (const [key, granted] of overrideMap) {
    const colonIdx = key.indexOf(':')
    const role = key.slice(0, colonIdx)
    const permId = key.slice(colonIdx + 1)
    const perms = rolePermMap.get(role)
    if (!perms) continue
    if (granted) {
      perms.add(permId)
    } else {
      perms.delete(permId)
    }
  }

  // Align DB actions with the matrix's action vocabulary (read/create/edit/delete).
  const actionMap: Record<string, string> = {
    read: 'read',
    create: 'create',
    update: 'edit',
    manage: 'edit',
    delete: 'delete',
    configure: 'edit',
    invite: 'create',
  }

  return roles.map(({ id: role, name, description, isSystem }) => {
    const permIds = rolePermMap.get(role)!
    const features: Record<string, string[]> = {}

    for (const permId of permIds) {
      const dotIdx = permId.indexOf('.')
      if (dotIdx === -1) continue
      const category = permId.slice(0, dotIdx)
      const action = permId.slice(dotIdx + 1)
      const mappedAction = actionMap[action]
      if (!mappedAction) continue

      if (!features[category]) features[category] = []
      if (!features[category].includes(mappedAction)) {
        features[category].push(mappedAction)
      }
    }

    // Org-management system permissions, derived from team/billing/settings
    // grants (owner gets all four). These gate the Equipe/Permissões tabs.
    const systemPermissions: SystemPermission[] = []
    const source = role === 'owner' ? ALL_SYSTEM_PERMISSIONS : [...permIds].map((id) => SYSTEM_PERMISSION_MAP[id])
    for (const sp of source) {
      if (sp && !systemPermissions.includes(sp)) systemPermissions.push(sp)
    }

    return {
      id: role,
      name: name || capitalize(role),
      description,
      isSystem: isSystem ?? true,
      systemPermissions,
      grants: features,
    }
  })
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export interface SupabaseOrgAdapterConfig {
  /** Override the core schema name (default: 'saas_core') */
  coreSchema?: string
  /** Business roles the host app declares (config.permissions.defaultProfiles).
   *  Falls back to the generic five when omitted. */
  roles?: RoleIdentity[]
  /** Auth adapter used to actually DELIVER invites (send the e-mail + create the
   *  auth user) — the org adapter only records the audit row. Injected by the app;
   *  when omitted, invites are recorded but not delivered. */
  authAdapter?: AuthAdapter
  /** Canonical, deployment-fixed origin baked into invite/magic-link redirects
   *  (e.g. https://beauty-saas.live.fayz.ai). The container injects it as
   *  VITE_APP_URL; the app wiring passes it here. Falls back to
   *  window.location.origin, which is wrong when an admin invites from a preview
   *  or localhost origin. Note: whatever origin ends up here must ALSO be in the
   *  Supabase project's Redirect URLs allow-list, or Supabase silently swaps it
   *  for its Site URL (default http://localhost:3000). */
  siteUrl?: string
}

export function createSupabaseOrgAdapter(config?: SupabaseOrgAdapterConfig): OrgAdapter {
  const schema = config?.coreSchema ?? CORE_SCHEMA
  const roles: RoleIdentity[] = config?.roles && config.roles.length > 0 ? config.roles : DEFAULT_ROLES
  const authAdapter = config?.authAdapter
  const originBase =
    config?.siteUrl?.replace(/\/+$/, '') ??
    (typeof window !== 'undefined' ? window.location.origin : undefined)
  const inviteRedirectTo = originBase ? `${originBase}/` : undefined

  function supabase() {
    return getFayzSupabaseClient()
  }

  function core() {
    return supabase().schema(schema)
  }

  return {
    async listUserOrgs(userId: string): Promise<OrgMembership[]> {
      return dedup(`listUserOrgs:${userId}`, async () => {
        const { data, error } = await core()
          .from('tenant_members')
          .select('tenant_id, role, tenant:tenants(id, name, slug, logo_url)')
          .eq('user_id', userId)

        if (error) throw error

        return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          orgId: row['tenant_id'] as string,
          orgName: ((row['tenant'] as Record<string, unknown>)?.['name'] as string) ?? '',
          orgSlug: ((row['tenant'] as Record<string, unknown>)?.['slug'] as string) ?? '',
          orgLogoUrl: ((row['tenant'] as Record<string, unknown>)?.['logo_url'] as string | null) ?? undefined,
          profileId: row['role'] as string,
          profileName: capitalize(row['role'] as string),
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
      return mapTenantToOrg(data as Record<string, unknown>)
    },

    async createOrg(name: string, userId: string, options?: CreateOrgOptions): Promise<Organization> {
      const { data: tenant, error } = await supabase()
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
      return mapTenantToOrg(tenant as Record<string, unknown>)
    },

    async updateOrg(orgId: string, updates: Partial<Organization>): Promise<Organization> {
      const row: Record<string, unknown> = {}
      if (updates.name !== undefined) row['name'] = updates.name
      if (updates.slug !== undefined) row['slug'] = updates.slug
      if (updates.logoUrl !== undefined) row['logo_url'] = updates.logoUrl
      if (updates.verticalId !== undefined) row['vertical_id'] = updates.verticalId
      if (updates.plan !== undefined) row['plan'] = updates.plan
      if (updates.settings !== undefined) row['settings'] = updates.settings

      const { data, error } = await core()
        .from('tenants')
        .update(row)
        .eq('id', orgId)
        .select()
        .single()

      if (error) throw error
      return mapTenantToOrg(data as Record<string, unknown>)
    },

    async listMembers(orgId: string): Promise<OrgMember[]> {
      const { data, error } = await core()
        .from('tenant_members')
        .select('*')
        .eq('tenant_id', orgId)

      if (error) throw error

      const userIds = ((data ?? []) as Array<Record<string, unknown>>).map((m) => m['user_id'] as string)
      const { data: profiles } = userIds.length > 0
        ? await core().from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
        : { data: [] }

      const profileMap = new Map(
        ((profiles ?? []) as Array<Record<string, unknown>>).map((p) => [p['id'], p]),
      )

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const profile = profileMap.get(row['user_id'] as string) ?? {}
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
      const [permsResult, rolePermsResult, overridesResult, customResult] = await Promise.all([
        core().from('permissions').select('id, category'),
        core().from('role_permissions').select('role, permission_id'),
        core().from('tenant_role_overrides').select('role, permission_id, granted').eq('tenant_id', orgId),
        // Custom roles the tenant created by duplicating a system role. Tolerate a
        // missing table (pre-seed) — just show the system roles in that case.
        core().from('tenant_roles').select('key, name, description').eq('tenant_id', orgId),
      ])

      if (permsResult.error) throw permsResult.error
      if (rolePermsResult.error) throw rolePermsResult.error
      if (overridesResult.error) throw overridesResult.error

      const systemRoles: RoleIdentity[] = roles.map((r) => ({ ...r, isSystem: true }))
      const customRoles: RoleIdentity[] = customResult.error
        ? []
        : ((customResult.data ?? []) as Array<{ key: string; name: string; description: string | null }>).map((r) => ({
            id: r.key,
            name: r.name,
            description: r.description ?? undefined,
            isSystem: false,
          }))

      return buildPermissionProfiles(
        [...systemRoles, ...customRoles],
        (permsResult.data ?? []) as Array<{ id: string; category: string }>,
        (rolePermsResult.data ?? []) as Array<{ role: string; permission_id: string }>,
        (overridesResult.data ?? []) as Array<{ role: string; permission_id: string; granted: boolean }>,
      )
    },

    async createProfile(
      orgId: string,
      profile: Omit<PermissionProfile, 'id' | 'isSystem'>,
    ): Promise<PermissionProfile> {
      // Custom roles live in tenant_roles (identity/name) + tenant_role_overrides
      // (their grants). System roles stay app-defined and untouched.
      const existing = new Set(
        ((await core().from('tenant_roles').select('key').eq('tenant_id', orgId)).data ?? [])
          .map((r: { key: string }) => r.key),
      )
      let key = slugifyRole(profile.name)
      if (existing.has(key) || roles.some((r) => r.id === key)) {
        let n = 2
        while (existing.has(`${key}-${n}`) || roles.some((r) => r.id === `${key}-${n}`)) n++
        key = `${key}-${n}`
      }

      const insertRole = await core()
        .from('tenant_roles')
        .insert({ tenant_id: orgId, key, name: profile.name, description: profile.description ?? null })
      if (insertRole.error) throw insertRole.error

      const overrides = Object.entries(profile.grants ?? {}).flatMap(([category, actions]) =>
        actions.map((action) => ({
          tenant_id: orgId,
          role: key,
          permission_id: `${category}.${DB_ACTION[action] ?? action}`,
          granted: true,
        })),
      )
      if (overrides.length > 0) {
        const { error } = await core().from('tenant_role_overrides').insert(overrides)
        if (error) throw error
      }

      const profiles = await this.listProfiles(orgId)
      return profiles.find((p) => p.id === key) ?? {
        id: key, name: profile.name, description: profile.description, isSystem: false,
        systemPermissions: profile.systemPermissions ?? [], grants: profile.grants ?? {},
      }
    },

    async updateProfile(
      orgId: string,
      profileId: string,
      data: Partial<PermissionProfile>,
    ): Promise<PermissionProfile> {
      if (data.grants) {
        await core()
          .from('tenant_role_overrides')
          .delete()
          .eq('tenant_id', orgId)
          .eq('role', profileId)

        const overrides: Array<{
          tenant_id: string
          role: string
          permission_id: string
          granted: boolean
        }> = []

        for (const [category, actions] of Object.entries(data.grants)) {
          for (const action of actions) {
            // Matrix emits read/create/edit/delete; map back to DB action verbs.
            const dbActionMap: Record<string, string> = {
              read: 'read',
              create: 'create',
              edit: 'update',
              write: 'create',
              manage: 'manage',
              delete: 'delete',
            }
            const dbAction = dbActionMap[action] ?? action
            overrides.push({
              tenant_id: orgId,
              role: profileId,
              permission_id: `${category}.${dbAction}`,
              granted: true,
            })
          }
        }

        if (overrides.length > 0) {
          const { error } = await core().from('tenant_role_overrides').insert(overrides)
          if (error) throw error
        }
      }

      const profiles = await this.listProfiles(orgId)
      const updated = profiles.find((p) => p.id === profileId)
      if (!updated) throw new Error(`Profile not found: ${profileId}`)
      return updated
    },

    async deleteProfile(orgId: string, profileId: string): Promise<void> {
      // Only custom roles (present in tenant_roles) can be deleted; system roles
      // are app-defined and static.
      const found = await core()
        .from('tenant_roles')
        .select('key')
        .eq('tenant_id', orgId)
        .eq('key', profileId)
        .maybeSingle()
      if (found.error) throw found.error
      if (!found.data) throw new Error('System roles cannot be deleted.')

      await core().from('tenant_role_overrides').delete().eq('tenant_id', orgId).eq('role', profileId)
      const { error } = await core().from('tenant_roles').delete().eq('tenant_id', orgId).eq('key', profileId)
      if (error) throw error
    },

    async listInvites(orgId: string): Promise<Invite[]> {
      const { data, error } = await core()
        .from('invitations')
        .select('*')
        .eq('tenant_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapInviteRow)
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
      // Deliver via the auth abstraction (sends the e-mail + creates the auth user,
      // stamping tenant_id/role on its metadata for the accept-time membership trigger).
      await authAdapter?.inviteUser?.(email, {
        redirectTo: inviteRedirectTo,
        data: { tenant_id: orgId, role: profileId, invited_by: invitedBy },
      })
      return mapInviteRow(data as Record<string, unknown>)
    },

    async bulkInvite(orgId: string, emails: string[], profileId: string, invitedBy: string): Promise<Invite[]> {
      const rows = emails.map((email) => ({
        tenant_id: orgId,
        email,
        role: profileId,
        invited_by: invitedBy,
      }))

      const { data, error } = await core().from('invitations').insert(rows).select()
      if (error) throw error
      await Promise.all(
        emails.map((email) =>
          authAdapter?.inviteUser?.(email, {
            redirectTo: inviteRedirectTo,
            data: { tenant_id: orgId, role: profileId, invited_by: invitedBy },
          }),
        ),
      )
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapInviteRow)
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
      const row = data as Record<string, unknown>
      // Re-send the invite e-mail through the auth abstraction.
      await authAdapter?.inviteUser?.(row.email as string, {
        redirectTo: inviteRedirectTo,
        data: { tenant_id: orgId, role: row.role as string, invited_by: row.invited_by as string },
      })
      return mapInviteRow(row)
    },

    async listLocations(orgId: string): Promise<Location[]> {
      const { data, error } = await core()
        .from('locations')
        .select('*')
        .eq('tenant_id', orgId)
        .order('is_headquarters', { ascending: false })
        .order('name')

      if (error) throw error
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapLocationRow)
    },

    async createLocation(
      orgId: string,
      input: {
        name: string
        address?: string
        city?: string
        state?: string
        country?: string
        phone?: string
        isHeadquarters?: boolean
      },
    ): Promise<Location> {
      const { data, error } = await core()
        .from('locations')
        .insert({
          tenant_id: orgId,
          name: input.name,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          country: input.country ?? 'BR',
          phone: input.phone ?? null,
          is_headquarters: input.isHeadquarters ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return mapLocationRow(data as Record<string, unknown>)
    },
  }
}
