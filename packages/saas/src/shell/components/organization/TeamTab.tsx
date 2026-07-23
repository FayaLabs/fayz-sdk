import * as React from 'react'
import { UserPlus, MoreHorizontal, Mail, Clock } from 'lucide-react'
import { Card } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { Skeleton } from '@fayz-ai/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@fayz-ai/ui'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@fayz-ai/ui'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@fayz-ai/ui'
import { InviteMemberDialog } from './InviteMemberDialog'
import { toast } from '../notifications/ToastProvider'
import { useOrganizationStore } from '../../stores/organization.store'
import { usePermissionsStore } from '../../stores/permissions.store'
import { useInviteStore } from '../../stores/invite.store'
// Native org adapter (see InviteMemberDialog) — the shell context is un-provided.
import { useOrgAdapterOptional as useNativeOrgAdapter } from '../../../org'
import type { OrgAdapter } from '../../types/org-adapter'
const useOrgAdapterOptional = () => useNativeOrgAdapter() as unknown as OrgAdapter | null
import { useAuthStore } from '@fayz-ai/auth'
import { useSystemPermission } from '../../hooks/useSystemPermission'
import { useTranslation } from '../../hooks/useTranslation'
import { dedup } from '../../lib/dedup'
import { useLimitGuard, invalidateLimit } from '../../../access'

// A normalized team row: either a person (person-first mode) with an optional
// access overlay, or a legacy tenant_members row. `memberId` present ⇒ has login+role.
interface TeamRow {
  key: string
  name: string
  email: string
  avatarUrl?: string
  /** kind label shown next to the name in person mode (e.g. "Staff"). */
  subtitle?: string
  roleId?: string
  roleName?: string
  memberId?: string
  hasAccess: boolean
  joinedAt?: string
  isCurrentUser: boolean
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function TeamTab() {
  const adapter = useOrgAdapterOptional()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const members = useOrganizationStore((s) => s.members)
  const setMembers = useOrganizationStore((s) => s.setMembers)
  const teamPersonKinds = useOrganizationStore((s) => s.teamPersonKinds)
  const profiles = usePermissionsStore((s) => s.profiles)
  const invites = useInviteStore((s) => s.invites)
  const setInvites = useInviteStore((s) => s.setInvites)
  const { user } = useAuthStore()
  const hasSystemPermission = useSystemPermission()

  // Person-first mode: drive the list from people of the configured kinds when
  // the adapter supports it. Otherwise fall back to the legacy members list.
  const personMode = teamPersonKinds.length > 0 && typeof adapter?.listTeam === 'function'
  const [team, setTeam] = React.useState<Awaited<ReturnType<NonNullable<OrgAdapter['listTeam']>>> | null>(null)

  const [inviteOpen, setInviteOpen] = React.useState(false)
  // Seat cap ('users' limit → tenant_members count). Guarded before opening the
  // invite dialog; the guard opens the global UpgradeModal when at the cap.
  const guardSeats = useLimitGuard('users')

  const handleOpenInvite = async () => {
    if ((await guardSeats(1)) === 'blocked') return
    setInviteOpen(true)
  }

  const reloadTeam = React.useCallback(async () => {
    if (!adapter || !currentOrg) return
    if (personMode && adapter.listTeam) {
      setTeam(await adapter.listTeam(currentOrg.id, teamPersonKinds))
    } else {
      setMembers(await adapter.listMembers(currentOrg.id))
    }
  }, [adapter, currentOrg?.id, personMode, teamPersonKinds, setMembers])

  // Load the person-first team list when in person mode (deduped).
  React.useEffect(() => {
    if (personMode && adapter?.listTeam && currentOrg) {
      dedup('team:people:' + currentOrg.id, () => adapter.listTeam!(currentOrg.id, teamPersonKinds))
        .then(setTeam)
        .catch(() => setTeam([]))
    }
  }, [personMode, adapter, currentOrg?.id, teamPersonKinds.join(',')])

  // Load invites on mount (deduped to avoid strict mode double-fetch)
  React.useEffect(() => {
    if (adapter && currentOrg) {
      dedup('team:invites:' + currentOrg.id, () => adapter.listInvites(currentOrg.id)).then(setInvites).catch(() => {})
    }
  }, [adapter, currentOrg?.id])

  const handleChangeProfile = async (memberId: string, profileId: string) => {
    if (!adapter || !currentOrg) return
    try {
      await adapter.updateMemberProfile(currentOrg.id, memberId, profileId)
      await reloadTeam()
    } catch {
      // ignore
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!adapter || !currentOrg) return
    try {
      await adapter.removeMember(currentOrg.id, memberId)
      await reloadTeam()
    } catch {
      // ignore
    }
  }

  // Normalized rows for the table — person-first or legacy members.
  const rows: TeamRow[] = personMode
    ? (team ?? []).map((p) => ({
        key: p.personId,
        name: p.name,
        email: p.email ?? '',
        avatarUrl: p.avatarUrl,
        subtitle: capitalize(p.kind),
        roleId: p.membership?.profileId,
        roleName: p.membership?.profileName,
        memberId: p.membership?.memberId,
        hasAccess: !!p.membership,
        joinedAt: p.membership?.joinedAt,
        isCurrentUser: p.membership?.userId === user?.id,
      }))
    : members.map((m) => ({
        key: m.id,
        name: m.user.fullName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        roleId: m.profileId,
        roleName: m.profileName,
        memberId: m.id,
        hasAccess: true,
        joinedAt: m.joinedAt,
        isCurrentUser: m.userId === user?.id,
      }))
  const rowsLoading = personMode ? team === null : members.length === 0

  const handleRevokeInvite = async (inviteId: string) => {
    if (!adapter || !currentOrg) return
    try {
      await adapter.revokeInvite(currentOrg.id, inviteId)
      const updated = await adapter.listInvites(currentOrg.id)
      setInvites(updated)
      toast.success(t('organization.team.inviteRevoked'))
    } catch (err: any) {
      toast.error(t('organization.team.inviteActionFailed'), { description: err?.message })
    }
  }

  const handleResendInvite = async (inviteId: string) => {
    if (!adapter || !currentOrg) return
    try {
      await adapter.resendInvite(currentOrg.id, inviteId)
      const updated = await adapter.listInvites(currentOrg.id)
      setInvites(updated)
      toast.success(t('organization.team.inviteResent'))
    } catch (err: any) {
      toast.error(t('organization.team.inviteActionFailed'), { description: err?.message })
    }
  }

  const { t } = useTranslation()
  const canManageTeam = hasSystemPermission('manage_team')
  const pendingInvites = invites.filter((i) => i.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t('organization.team.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('organization.team.memberCount', { count: String(rows.length), plural: rows.length !== 1 ? 's' : '' })}</p>
          </div>
          {canManageTeam && (
            <Button size="sm" onClick={() => { void handleOpenInvite() }}>
              <UserPlus className="h-4 w-4 mr-1" />
              {t('organization.team.invite')}
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('organization.team.member')}</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('organization.team.role')}</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('organization.team.joined')}</th>
                  {canManageTeam && (
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground w-12" />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rowsLoading ? (
                  // Rows load async; show skeleton rows meanwhile.
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      </td>
                      <td className="p-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="p-3"><Skeleton className="h-3 w-20" /></td>
                      {canManageTeam && <td className="p-3" />}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={canManageTeam ? 4 : 3} className="p-6 text-center text-sm text-muted-foreground">
                      {t('organization.team.empty')}
                    </td>
                  </tr>
                ) : rows.map((row) => {
                  const initials = (row.name || '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr key={row.key} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {row.avatarUrl && <AvatarImage src={row.avatarUrl} />}
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {row.name}
                              {row.isCurrentUser && <span className="text-muted-foreground ml-1">{t('organization.team.you')}</span>}
                              {row.subtitle && <Badge variant="outline" className="ml-2 text-[10px] font-normal">{row.subtitle}</Badge>}
                            </p>
                            {row.email && <p className="text-xs text-muted-foreground">{row.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {!row.hasAccess ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs text-muted-foreground">{t('organization.team.noAccess')}</Badge>
                            {canManageTeam && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { void handleOpenInvite() }}>
                                <UserPlus className="h-3 w-3 mr-1" />
                                {t('organization.team.invite')}
                              </Button>
                            )}
                          </div>
                        ) : canManageTeam && !row.isCurrentUser && row.memberId ? (
                          <Select
                            value={row.roleId}
                            onValueChange={(val) => handleChangeProfile(row.memberId!, val)}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {profiles.find((p) => p.id === row.roleId)?.name ?? row.roleName}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : '—'}
                      </td>
                      {canManageTeam && (
                        <td className="p-3 text-right">
                          {row.hasAccess && !row.isCurrentUser && row.memberId && (
                            <Dropdown>
                              <DropdownTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownTrigger>
                              <DropdownContent align="end">
                                <DropdownItem
                                  className="text-destructive"
                                  onClick={() => handleRemoveMember(row.memberId!)}
                                >
                                  {t('organization.team.removeMember')}
                                </DropdownItem>
                              </DropdownContent>
                            </Dropdown>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('organization.team.pendingInvites')}</h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <Card key={invite.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{invite.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">{invite.profileName}</Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Sent {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {canManageTeam && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleResendInvite(invite.id)}>
                        {t('organization.team.resend')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => handleRevokeInvite(invite.id)}>
                        {t('organization.team.revoke')}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          // On close (after a successful invite the dialog closes itself),
          // refresh the seat count so the guard/banner reflect the new member.
          if (!open) invalidateLimit('users')
        }}
      />
    </div>
  )
}
