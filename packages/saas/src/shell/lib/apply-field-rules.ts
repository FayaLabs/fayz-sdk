import type { FieldDef, EntityFieldRules } from '../types/crud'

/** Merge tenant field-rule overrides into static FieldDef[]. Pure & testable. */
export function applyFieldRules(
  fields: FieldDef[],
  rules: EntityFieldRules | undefined,
): FieldDef[] {
  if (!rules) return fields
  return fields.map((f) => {
    const override = rules[f.key]
    if (!override) return f
    return { ...f, ...override }
  })
}
