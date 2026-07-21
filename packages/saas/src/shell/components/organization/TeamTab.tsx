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

export function TeamTab() {
  const adapter = useOrgAdapterOptional()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const members = useOrganizationStore((s) => s.members)
  const setMembers = useOrganizationStore((s) => s.setMembers)
  const profiles = usePermissionsStore((s) => s.profiles)
  const invites = useInviteStore((s) => s.invites)
  const setInvites = useInviteStore((s) => s.setInvites)
  const { user } = useAuthStore()
  const hasSystemPermission = useSystemPermission()

  const [inviteOpen, setInviteOpen] = React.useState(false)
  // Seat cap ('users' limit → tenant_members count). Guarded before opening the
  // invite dialog; the guard opens the global UpgradeModal when at the cap.
  const guardSeats = useLimitGuard('users')

  const handleOpenInvite = async () => {
    if ((await guardSeats(1)) === 'blocked') return
    setInviteOpen(true)
  }

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
      const updated = await adapter.listMembers(currentOrg.id)
      setMembers(updated)
    } catch {
      // ignore
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!adapter || !currentOrg) return
    try {
      await adapter.removeMember(currentOrg.id, memberId)
      const updated = await adapter.listMembers(currentOrg.id)
      setMembers(updated)
    } catch {
      // ignore
    }
  }

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
            <p className="text-sm text-muted-foreground">{t('organization.team.memberCount', { count: String(members.length), plural: members.length !== 1 ? 's' : '' })}</p>
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
                {members.length === 0 ? (
                  // Members load via central org hydration; show skeleton rows meanwhile.
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
                ) : members.map((member) => {
                  const initials = member.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  const isCurrentUser = member.userId === user?.id

                  return (
                    <tr key={member.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {member.user.avatarUrl && <AvatarImage src={member.user.avatarUrl} />}
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {member.user.fullName}
                              {isCurrentUser && <span className="text-muted-foreground ml-1">{t('organization.team.you')}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {canManageTeam && !isCurrentUser ? (
                          <Select
                            value={member.profileId}
                            onValueChange={(val) => handleChangeProfile(member.id, val)}
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
                            {profiles.find((p) => p.id === member.profileId)?.name ?? member.profileName}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      {canManageTeam && (
                        <td className="p-3 text-right">
                          {!isCurrentUser && (
                            <Dropdown>
                              <DropdownTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownTrigger>
                              <DropdownContent align="end">
                                <DropdownItem
                                  className="text-destructive"
                                  onClick={() => handleRemoveMember(member.id)}
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
