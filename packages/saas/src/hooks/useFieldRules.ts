import type { FieldDef } from '@fayz/core'

// Tenant field-rule overrides (required / visibility / custom fields). Currently
// a permissive identity pass-through; tenant-level customization (blueprint
// §4.11 "Regras de Campos") plugs in here later without changing call sites.
export function useFieldRules(_entityKey: string): {
  applyRules: (fields: FieldDef[]) => FieldDef[]
} {
  return { applyRules: (fields) => fields }
}
