import { FieldRulesSettings } from './FieldRulesSettings'
import { useOrganizationStore } from '../../stores/organization.store'
import { useOrgAdapterOptional } from '../../lib/org-context'
import { getRegisteredEntities } from '../../lib/entity-registry'
import { toast } from '../notifications/ToastProvider'
import { useTranslation } from '../../hooks/useTranslation'
import type { TenantFieldRules, TenantSettings } from '../../types'

function extractFieldRules(settings: unknown): TenantFieldRules {
  if (!settings || typeof settings !== 'object') return {}
  return (settings as Record<string, unknown>).fieldRules as TenantFieldRules ?? {}
}

export function ConnectedFieldRulesSettings() {
  const { t } = useTranslation()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)
  const adapter = useOrgAdapterOptional()
  const entities = getRegisteredEntities()
  const rules = extractFieldRules(currentOrg?.settings)

  const handleSave = async (newRules: TenantFieldRules) => {
    if (!adapter || !currentOrg) return

    try {
      const currentSettings = (currentOrg.settings ?? {}) as Record<string, unknown>
      const updated = await adapter.updateOrg(currentOrg.id, {
        settings: {
          ...currentSettings,
          fieldRules: newRules,
        },
      })
      setCurrentOrg(updated)
      toast.success(t('settings.fieldRules.saved'))
    } catch (err: any) {
      toast.error(t('settings.fieldRules.saveFailed'), { description: err?.message })
    }
  }

  return (
    <FieldRulesSettings
      entities={entities}
      rules={rules}
      onSave={handleSave}
    />
  )
}
