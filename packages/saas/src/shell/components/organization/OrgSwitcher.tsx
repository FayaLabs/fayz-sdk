import * as React from 'react'
import { Building2, Check, ChevronDown, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useOrganizationStore } from '../../stores/organization.store'
import { useOrgAdapterOptional } from '../../lib/org-context'
import { useAuthStore } from '../../stores/auth.store'
import { usePermissionsStore } from '../../stores/permissions.store'
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@fayz-ai/ui'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'

interface OrgSwitcherProps {
  collapsed?: boolean
}

export function OrgSwitcher({ collapsed }: OrgSwitcherProps) {
  const adapter = useOrgAdapterOptional()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const userOrgs = useOrganizationStore((s) => s.userOrgs)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)
  const setUserOrgs = useOrganizationStore((s) => s.setUserOrgs)
  const setMembers = useOrganizationStore((s) => s.setMembers)
  const setCurrentProfile = usePermissionsStore((s) => s.setCurrentProfile)
  const setProfiles = usePermissionsStore((s) => s.setProfiles)
  const user = useAuthStore((s) => s.user)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [newOrgName, setNewOrgName] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const { t } = useTranslation()

  if (!adapter || !currentOrg) return null

  const initial = currentOrg.name.charAt(0).toUpperCase()

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrg.id || !adapter || !user) return
    try {
      const org = await adapter.getOrg(orgId)
      setCurrentOrg(org)
      const members = await adapter.listMembers(orgId)
      setMembers(members)
      const profiles = await adapter.listProfiles(orgId)
      setProfiles(profiles)
      const myMembership = members.find((m) => m.userId === user.id)
      if (myMembership) {
        const profile = profiles.find((p) => p.id === myMembership.profileId)
        setCurrentProfile(profile ?? null)
      }
    } catch {
      // ignore
    }
  }

  const handleCreate = async () => {
    if (!newOrgName.trim() || !adapter || !user) return
    setCreating(true)
    try {
      const org = await adapter.createOrg(newOrgName.trim(), user.id)
      const orgs = await adapter.listUserOrgs(user.id)
      setUserOrgs(orgs)
      setCurrentOrg(org)
      const members = await adapter.listMembers(org.id)
      setMembers(members)
      const profiles = await adapter.listProfiles(org.id)
      setProfiles(profiles)
      const myMembership = members.find((m) => m.userId === user.id)
      if (myMembership) {
        const profile = profiles.find((p) => p.id === myMembership.profileId)
        setCurrentProfile(profile ?? null)
      }
      setCreateOpen(false)
      setNewOrgName('')
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className={cn(collapsed ? 'px-1 py-2' : 'px-3 py-2')}>
        <Dropdown>
          <DropdownTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-sidebar-accent',
                collapsed && 'justify-center px-0'
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground text-xs font-bold">
                {currentOrg.logoUrl ? (
                  <img src={currentOrg.logoUrl} alt="" className="h-full w-full rounded-md object-cover" />
                ) : (
                  initial
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left">{currentOrg.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" />
                </>
              )}
            </button>
          </DropdownTrigger>
          <DropdownContent align="start" className="w-56 bg-sidebar text-sidebar-foreground border-sidebar-border">
            {userOrgs.map((org) => (
              <DropdownItem
                key={org.orgId}
                onClick={() => handleSwitch(org.orgId)}
                className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-sidebar-accent text-sidebar-accent-foreground text-xs font-bold">
                  {org.orgLogoUrl ? (
                    <img src={org.orgLogoUrl} alt="" className="h-full w-full rounded object-cover" />
                  ) : (
                    org.orgName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="flex-1 truncate">{org.orgName}</span>
                {org.orgId === currentOrg.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownItem>
            ))}
            <DropdownSeparator className="bg-sidebar-border" />
            <DropdownItem onClick={() => setCreateOpen(true)} className="flex items-center gap-2 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground">
              <Plus className="h-4 w-4" />
              <span>{t('organization.createOrg')}</span>
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t('organization.createOrgTitle')}</ModalTitle>
            <ModalDescription>{t('organization.createOrgDescription')}</ModalDescription>
          </ModalHeader>
          <div className="py-4">
            <Input
              placeholder={t('organization.orgNamePlaceholder')}
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              autoFocus
            />
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={!newOrgName.trim() || creating}>
              {creating ? t('organization.creating') : t('common.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
