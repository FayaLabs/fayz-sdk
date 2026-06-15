import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, Loader2, Search, ChevronsUpDown } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '../../lib/cn'
import { Card, CardContent } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Checkbox } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { RegisteredEntity } from '../../lib/entity-registry'
import type { TenantFieldRules, EntityFieldRules, FieldRuleOverride, FieldDef } from '../../types/crud'

interface FieldRulesSettingsProps {
  entities: RegisteredEntity[]
  rules: TenantFieldRules
  onSave: (rules: TenantFieldRules) => Promise<void>
}

type OverrideKey = keyof FieldRuleOverride

const RULE_COLUMNS: { key: OverrideKey; labelKey: string }[] = [
  { key: 'required', labelKey: 'settings.fieldRules.required' },
  { key: 'showInForm', labelKey: 'settings.fieldRules.inForm' },
  { key: 'showInTable', labelKey: 'settings.fieldRules.inTable' },
  { key: 'showInDetail', labelKey: 'settings.fieldRules.inDetail' },
]

/** Core SaaS archetypes — shown in the main section */
const CORE_ARCHETYPES = new Set([
  'person', 'product', 'service', 'category', 'order', 'location',
])

/** Priority order for sorting core entities */
const ARCHETYPE_ORDER: Record<string, number> = {
  person: 0,
  service: 1,
  product: 2,
  category: 3,
  order: 4,
  location: 5,
}

function isCoreEntity(entity: RegisteredEntity): boolean {
  if (entity.archetype && CORE_ARCHETYPES.has(entity.archetype)) return true
  const prefix = entity.entityKey.split(':')[0]
  return CORE_ARCHETYPES.has(prefix)
}

function entitySortKey(entity: RegisteredEntity): number {
  const prefix = entity.archetype ?? entity.entityKey.split(':')[0]
  return ARCHETYPE_ORDER[prefix] ?? 99
}

/** Group structure for plugin entities */
interface PluginGroup {
  pluginId: string
  pluginName: string
  pluginIcon: string
  entities: RegisteredEntity[]
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function getDefaultValue(field: FieldDef, key: OverrideKey): boolean {
  switch (key) {
    case 'required':
      return field.required ?? false
    case 'showInForm':
      return field.showInForm !== false
    case 'showInTable':
      return field.showInTable !== false
    case 'showInDetail':
      return field.showInDetail !== false
  }
}

function getEffectiveValue(
  field: FieldDef,
  key: OverrideKey,
  rules: EntityFieldRules | undefined,
): boolean {
  const override = rules?.[field.key]?.[key]
  if (override != null) return override
  return getDefaultValue(field, key)
}

function isFieldModified(
  field: FieldDef,
  rules: EntityFieldRules | undefined,
): boolean {
  if (!rules?.[field.key]) return false
  return RULE_COLUMNS.some((col) => {
    const override = rules[field.key]?.[col.key]
    return override != null && override !== getDefaultValue(field, col.key)
  })
}

function countModified(
  fields: FieldDef[],
  rules: EntityFieldRules | undefined,
): number {
  if (!rules) return 0
  return fields.filter((f) => isFieldModified(f, rules)).length
}

function resolveIcon(iconName: string): React.ComponentType<any> | null {
  return (LucideIcons as any)[iconName] ?? null
}

function matchesSearch(entity: RegisteredEntity, q: string): boolean {
  return (
    entity.label.toLowerCase().includes(q) ||
    entity.labelPlural.toLowerCase().includes(q) ||
    entity.entityKey.toLowerCase().includes(q)
  )
}

// ---------------------------------------------------------------------------
// EntityAccordion
// ---------------------------------------------------------------------------

function EntityAccordion({
  entity,
  rules,
  onToggle,
  onReset,
}: {
  entity: RegisteredEntity
  rules: EntityFieldRules | undefined
  onToggle: (entityKey: string, fieldKey: string, ruleKey: OverrideKey, value: boolean) => void
  onReset: (entityKey: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const modified = countModified(entity.fields, rules)
  const Icon = resolveIcon(entity.icon)

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <span className="text-sm font-semibold flex-1">{entity.labelPlural || entity.label}</span>
        {modified > 0 && (
          <span className="text-xs text-primary font-medium tabular-nums">
            {t('settings.fieldRules.modified', { count: String(modified) })}
          </span>
        )}
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 px-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium text-muted-foreground py-2 pr-4 w-[40%]">
                    {t('settings.fieldRules.field')}
                  </th>
                  {RULE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="text-center font-medium text-muted-foreground py-2 px-3 w-[15%]"
                    >
                      {t(col.labelKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entity.fields.map((field) => {
                  const fieldModified = isFieldModified(field, rules)
                  return (
                    <tr
                      key={field.key}
                      className={cn(
                        'border-b last:border-0',
                        fieldModified && 'bg-primary/[0.03]',
                      )}
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{field.label}</span>
                          {fieldModified && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                      </td>
                      {RULE_COLUMNS.map((col) => {
                        const effective = getEffectiveValue(field, col.key, rules)
                        const defaultVal = getDefaultValue(field, col.key)
                        const overridden = rules?.[field.key]?.[col.key]
                        const isModified = overridden != null && overridden !== defaultVal
                        return (
                          <td key={col.key} className="text-center py-2.5 px-3">
                            <div className="inline-flex items-center gap-1">
                              <Checkbox
                                checked={effective}
                                onChange={(val) =>
                                  onToggle(entity.entityKey, field.key, col.key, val)
                                }
                              />
                              {isModified && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {modified > 0 && (
            <div className="flex justify-end pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onReset(entity.entityKey)
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {t('settings.fieldRules.resetDefaults')}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
      {label}
    </h3>
  )
}

function PluginSectionHeader({ name, iconName }: { name: string; iconName: string }) {
  const Icon = resolveIcon(iconName)
  return (
    <div className="flex items-center gap-2 px-1">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {name}
      </h3>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FieldRulesSettings({ entities, rules: initialRules, onSave }: FieldRulesSettingsProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<TenantFieldRules>(initialRules)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showMore, setShowMore] = useState(false)

  React.useEffect(() => {
    setDraft(initialRules)
  }, [initialRules])

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialRules),
    [draft, initialRules],
  )

  // Split entities: core standalone → standalone non-core → grouped by plugin
  const { coreEntities, standaloneEntities, pluginGroups } = useMemo(() => {
    const q = search.trim().toLowerCase()

    const core: RegisteredEntity[] = []
    const standalone: RegisteredEntity[] = []
    const pluginMap = new Map<string, PluginGroup>()

    for (const entity of entities) {
      if (q && !matchesSearch(entity, q)) continue

      if (entity.source === 'plugin' && entity.pluginId) {
        // Group under plugin
        let group = pluginMap.get(entity.pluginId)
        if (!group) {
          group = {
            pluginId: entity.pluginId,
            pluginName: entity.pluginName ?? entity.pluginId,
            pluginIcon: entity.pluginIcon ?? 'Puzzle',
            entities: [],
          }
          pluginMap.set(entity.pluginId, group)
        }
        group.entities.push(entity)
      } else if (isCoreEntity(entity)) {
        core.push(entity)
      } else {
        standalone.push(entity)
      }
    }

    // Sort core by archetype priority, then alphabetically
    core.sort((a, b) => {
      const orderDiff = entitySortKey(a) - entitySortKey(b)
      if (orderDiff !== 0) return orderDiff
      return (a.labelPlural || a.label).localeCompare(b.labelPlural || b.label)
    })

    standalone.sort((a, b) =>
      (a.labelPlural || a.label).localeCompare(b.labelPlural || b.label),
    )

    // Sort entities within each plugin group alphabetically
    const groups = Array.from(pluginMap.values())
    for (const group of groups) {
      group.entities.sort((a, b) =>
        (a.labelPlural || a.label).localeCompare(b.labelPlural || b.label),
      )
    }
    // Sort plugin groups by plugin name
    groups.sort((a, b) => a.pluginName.localeCompare(b.pluginName))

    return {
      coreEntities: core,
      standaloneEntities: standalone,
      pluginGroups: groups,
    }
  }, [entities, search])

  const isSearching = search.trim().length > 0
  const hasExtras = standaloneEntities.length > 0 || pluginGroups.length > 0
  const showExtras = hasExtras && (showMore || isSearching)
  const extraCount = standaloneEntities.length + pluginGroups.reduce((sum, g) => sum + g.entities.length, 0)
  const hasNoResults = coreEntities.length === 0 && !hasExtras

  const handleToggle = useCallback(
    (entityKey: string, fieldKey: string, ruleKey: OverrideKey, value: boolean) => {
      setDraft((prev) => {
        const entityRules = { ...prev[entityKey] }
        const fieldOverride = { ...entityRules[fieldKey] }
        fieldOverride[ruleKey] = value
        entityRules[fieldKey] = fieldOverride
        return { ...prev, [entityKey]: entityRules }
      })
    },
    [],
  )

  const handleReset = useCallback((entityKey: string) => {
    setDraft((prev) => {
      const next = { ...prev }
      delete next[entityKey]
      return next
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const cleaned: TenantFieldRules = {}
      for (const [entityKey, entityRules] of Object.entries(draft)) {
        const entity = entities.find((e) => e.entityKey === entityKey)
        if (!entity) continue

        const cleanedEntity: EntityFieldRules = {}
        for (const [fieldKey, override] of Object.entries(entityRules)) {
          const field = entity.fields.find((f) => f.key === fieldKey)
          if (!field) continue

          const cleanedOverride: FieldRuleOverride = {}
          let hasOverride = false
          for (const col of RULE_COLUMNS) {
            const val = override[col.key]
            if (val != null && val !== getDefaultValue(field, col.key)) {
              cleanedOverride[col.key] = val
              hasOverride = true
            }
          }
          if (hasOverride) {
            cleanedEntity[fieldKey] = cleanedOverride
          }
        }
        if (Object.keys(cleanedEntity).length > 0) {
          cleaned[entityKey] = cleanedEntity
        }
      }

      await onSave(cleaned)
    } finally {
      setSaving(false)
    }
  }

  const renderAccordions = (list: RegisteredEntity[]) =>
    list.map((entity) => (
      <EntityAccordion
        key={entity.entityKey}
        entity={entity}
        rules={draft[entity.entityKey]}
        onToggle={handleToggle}
        onReset={handleReset}
      />
    ))

  return (
    <div className="space-y-6">
      {/* Header + Save */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t('settings.fieldRules')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('settings.fieldRules.subtitle')}
          </p>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || saving} className="shrink-0">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('common.save')}
        </Button>
      </div>

      {/* Search */}
      {entities.length > 4 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('settings.fieldRules.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {hasNoResults ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {t('settings.fieldRules.noEntities')}
        </p>
      ) : (
        <div className="space-y-6">
          {/* Core register types — always visible */}
          {coreEntities.length > 0 && (
            <div className="space-y-2">
              <SectionHeader label={t('settings.fieldRules.coreRegisters')} />
              {renderAccordions(coreEntities)}
            </div>
          )}

          {/* Extras: standalone + plugin groups — behind "Load more" */}
          {showExtras && (
            <>
              {/* Standalone non-core, non-plugin entities */}
              {standaloneEntities.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label={t('settings.fieldRules.otherRegisters')} />
                  {renderAccordions(standaloneEntities)}
                </div>
              )}

              {/* Plugin groups — each with plugin name + icon header */}
              {pluginGroups.map((group) => (
                <div key={group.pluginId} className="space-y-2">
                  <PluginSectionHeader
                    name={group.pluginName}
                    iconName={group.pluginIcon}
                  />
                  {renderAccordions(group.entities)}
                </div>
              ))}
            </>
          )}

          {/* Load more / show less toggle */}
          {hasExtras && !isSearching && (
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              <ChevronsUpDown className="h-4 w-4" />
              {showMore
                ? t('settings.fieldRules.showLess')
                : t('settings.fieldRules.showMore', { count: String(extraCount) })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
