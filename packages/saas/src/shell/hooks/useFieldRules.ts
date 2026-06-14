import { useMemo } from 'react'
import { useOrganizationStore } from '../stores/organization.store'
import { applyFieldRules } from '../lib/apply-field-rules'
import type { FieldDef, TenantFieldRules, EntityFieldRules } from '../types/crud'

export function useFieldRules(entityKey: string) {
  const settings = useOrganizationStore((s) => s.currentOrg?.settings)
  const fieldRules = (settings as Record<string, unknown> | undefined)?.fieldRules as
    | TenantFieldRules
    | undefined

  return useMemo(() => {
    const rules: EntityFieldRules | undefined = fieldRules?.[entityKey]
    return {
      rules,
      applyRules: (fields: FieldDef[]) => applyFieldRules(fields, rules),
    }
  }, [entityKey, fieldRules])
}
