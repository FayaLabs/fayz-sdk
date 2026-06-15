import * as React from 'react'
import { Card } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { Checkbox, type CheckboxColor } from '@fayz-ai/ui'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import type { FeatureDeclaration, PermissionAction, PermissionProfile, SystemPermission } from '../../types/permissions'

const ACTIONS: PermissionAction[] = ['read', 'create', 'edit', 'delete']
const ACTION_COLORS: Partial<Record<PermissionAction, CheckboxColor>> = {
  read: 'primary',
  create: 'success',
  edit: 'warning',
  delete: 'destructive',
}
const SYSTEM_PERMISSIONS: { id: SystemPermission; key: string }[] = [
  { id: 'manage_team', key: 'organization.permissions.manageTeam' },
  { id: 'manage_billing', key: 'organization.permissions.manageBilling' },
  { id: 'manage_settings', key: 'organization.permissions.manageSettings' },
  { id: 'manage_permissions', key: 'organization.permissions.managePermissions' },
]

interface PermissionMatrixEditorProps {
  features: FeatureDeclaration[]
  profile?: PermissionProfile
  onSave: (data: { name: string; description?: string; systemPermissions: SystemPermission[]; grants: Record<string, PermissionAction[]> }) => void
  onCancel: () => void
  saving?: boolean
}

export function PermissionMatrixEditor({ features, profile, onSave, onCancel, saving }: PermissionMatrixEditorProps) {
  const { t } = useTranslation()
  const [name, setName] = React.useState(profile?.name ?? '')
  const [description, setDescription] = React.useState(profile?.description ?? '')
  const [systemPerms, setSystemPerms] = React.useState<SystemPermission[]>(profile?.systemPermissions ?? [])
  const [grants, setGrants] = React.useState<Record<string, PermissionAction[]>>(profile?.grants ?? {})
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [search, setSearch] = React.useState('')

  const toggleSystemPerm = (perm: SystemPermission) => {
    setSystemPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const toggleGrant = (featureId: string, action: PermissionAction) => {
    setGrants((prev) => {
      const current = prev[featureId] ?? []
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action]
      return { ...prev, [featureId]: next }
    })
  }

  const toggleGroup = (group: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim() || undefined, systemPermissions: systemPerms, grants })
  }

  // Group features, filtering by search
  const groups = React.useMemo(() => {
    const filtered = search
      ? features.filter((f) => f.label.toLowerCase().includes(search.toLowerCase()))
      : features
    const map = new Map<string, FeatureDeclaration[]>()
    for (const f of filtered) {
      const group = f.group ?? 'General'
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(f)
    }
    return map
  }, [features, search])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">{t('organization.permissions.profileName')}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('organization.permissions.profileNamePlaceholder')} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">{t('organization.permissions.description')}</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('organization.permissions.descriptionPlaceholder')} className="mt-1" />
        </div>
      </div>

      {/* Unified Permission Matrix */}
      <Card className="overflow-hidden">
        {/* Search filter */}
        {features.length > 8 && (
          <div className="border-b border-border/40 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('organization.permissions.searchFeatures')}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('common.feature')}</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="p-3 text-center text-sm font-medium text-muted-foreground capitalize w-20">
                    {t(`organization.permissions.action.${action}`) === `organization.permissions.action.${action}` ? action : t(`organization.permissions.action.${action}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* System permissions group */}
              <tr>
                <td colSpan={5} className="p-2 px-3">
                  <button
                    onClick={() => toggleGroup('__system')}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {collapsed.has('__system')
                      ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    }
                    <Badge variant="secondary" className="text-xs">{t('organization.permissions.systemPermissions')}</Badge>
                  </button>
                </td>
              </tr>
              {!collapsed.has('__system') && SYSTEM_PERMISSIONS.map((sp) => (
                <tr key={sp.id} className="hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{t(sp.key)}</td>
                  <td colSpan={4} className="p-3">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={systemPerms.includes(sp.id)}
                        onChange={() => toggleSystemPerm(sp.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {/* Feature permission groups */}
              {Array.from(groups.entries()).map(([groupName, groupFeatures]) => (
                <React.Fragment key={groupName}>
                  <tr>
                    <td colSpan={5} className="p-2 px-3">
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {collapsed.has(groupName)
                          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        }
                        <Badge variant="secondary" className="text-xs">{groupName}</Badge>
                        <span className="text-[10px] text-muted-foreground">{groupFeatures.length}</span>
                      </button>
                    </td>
                  </tr>
                  {!collapsed.has(groupName) && groupFeatures.map((feature) => (
                    <tr key={feature.id} className="hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{feature.label}</td>
                      {ACTIONS.map((action) => (
                        <td key={action} className="p-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={grants[feature.id]?.includes(action) ?? false}
                              onChange={() => toggleGrant(feature.id, action)}
                              color={ACTION_COLORS[action]}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? t('common.saving') : profile ? t('organization.permissions.updateProfile') : t('organization.permissions.createProfile')}
        </Button>
      </div>
    </div>
  )
}
