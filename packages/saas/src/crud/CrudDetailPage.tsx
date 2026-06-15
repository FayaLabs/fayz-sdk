import React, { useCallback } from 'react'
import { Edit, Trash2, Eye, Shield, CalendarDays, FileText, Clock, Package, Users, DollarSign, MapPin, BarChart3, Briefcase, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import { Breadcrumb } from '@fayz-ai/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@fayz-ai/ui'
import { Separator } from '@fayz-ai/ui'
import { WidgetSlot } from '../plugins/WidgetSlot'
import { formatCurrency } from '@fayz-ai/core'
import { PERSON_DETAIL_TABS } from './archetypes/PersonDetailTabs'
import { PRODUCT_DETAIL_TABS } from './archetypes/ProductDetailTabs'
import { SERVICE_DETAIL_TABS } from './archetypes/ServiceDetailTabs'
import { LOCATION_DETAIL_TABS } from './archetypes/LocationDetailTabs'
import { SUBJECT_DETAIL_TABS } from './archetypes/SubjectDetailTabs'
import { useTranslation } from '@fayz-ai/core'
import type { EntityDef, FieldDef, FieldGroup, FormLayout, DetailTab } from '@fayz-ai/core'

interface CrudDetailPageProps {
  entityDef: EntityDef
  item: Record<string, any>
  namePlural: string
  basePath: string
  initialTab?: string
  onBack: () => void
  onEdit?: () => void
  onDelete?: () => void
  feature?: string
  /** Embedded mode — compact hero, no breadcrumb, no hash nav. For use inside modals/panels. */
  embedded?: boolean
}

function formatValue(field: FieldDef, value: any, t?: (key: string) => string): React.ReactNode {
  if (value == null || value === '') return <span className="text-muted-foreground/50">—</span>

  if (field.renderCell) return field.renderCell(value, {})

  switch (field.type) {
    case 'boolean':
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? (t?.('common.yes') ?? 'Yes') : (t?.('common.no') ?? 'No')}
        </Badge>
      )
    case 'currency': {
      const num = typeof value === 'number' ? value : parseFloat(value)
      return isNaN(num) ? value : formatCurrency(num, field.currency)
    }
    case 'color':
      return (
        <span className="inline-flex items-center gap-2">
          <span className="h-5 w-5 rounded-full border shrink-0" style={{ backgroundColor: String(value) }} />
          <span className="text-xs font-mono text-muted-foreground">{String(value)}</span>
        </span>
      )
    case 'date':
      try { return new Date(value).toLocaleDateString() } catch { return value }
    case 'datetime':
      try { return new Date(value).toLocaleString() } catch { return value }
    case 'select': {
      const options = (field.options ?? []).map((o) => typeof o === 'string' ? { label: o, value: o } : o)
      const match = options.find((o) => o.value === value)
      return <Badge variant="secondary">{match?.label ?? value}</Badge>
    }
    case 'image':
      return value ? (
        <img src={value} alt="" className="h-16 w-16 rounded-lg object-cover" />
      ) : null
    case 'email':
      return <a href={`mailto:${value}`} className="text-primary hover:underline">{value}</a>
    case 'phone':
      return <a href={`tel:${value}`} className="text-primary hover:underline">{value}</a>
    case 'url':
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a>
    case 'textarea':
      return <p className="whitespace-pre-wrap">{value}</p>
    default:
      return String(value)
  }
}

function FieldRow({ field, value, t, compact }: { field: FieldDef; value: any; t?: (key: string) => string; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-4 ${compact ? 'py-1.5' : 'py-3'}`}>
      <dt className={`font-medium text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{field.label}</dt>
      <dd className={`col-span-2 text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{formatValue(field, value, t)}</dd>
    </div>
  )
}

function FieldGroupSection({
  group,
  fields,
  item,
  compact,
}: {
  group: FieldGroup
  fields: FieldDef[]
  item: Record<string, any>
  compact?: boolean
}) {
  const tFn = useTranslation()
  const cols = group.columns ?? 2

  return (
    <div>
      <h3 className={`font-semibold text-foreground ${compact ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>{group.label}</h3>
      {group.description && (
        <p className={`text-muted-foreground ${compact ? 'text-[10px] mb-1.5' : 'text-xs mb-3'}`}>{group.description}</p>
      )}
      <Card>
        <CardContent className="p-0">
          <dl className={`grid divide-y ${cols >= 2 ? 'md:grid-cols-2 md:divide-y-0' : ''}`}>
            {fields.map((field) => (
              <div key={field.key} className={compact ? 'px-3' : 'px-5'}>
                <FieldRow field={field} value={item[field.key]} t={tFn} compact={compact} />
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function OverviewTab({
  entityDef,
  item,
  compact,
}: {
  entityDef: EntityDef
  item: Record<string, any>
  compact?: boolean
}) {
  const tFn = useTranslation()
  const detailFields = entityDef.fields.filter(
    (f) => f.showInDetail !== false && f.key !== 'id' && f.key !== entityDef.displayField && f.key !== entityDef.imageField
  )

  // Group fields
  const groups = entityDef.fieldGroups ?? []
  const ungroupedFields = detailFields.filter((f) => !f.group)

  // Build group → fields map
  const groupFieldMap = new Map<string, FieldDef[]>()
  for (const field of detailFields) {
    if (field.group) {
      const existing = groupFieldMap.get(field.group) ?? []
      existing.push(field)
      groupFieldMap.set(field.group, existing)
    }
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {/* Ungrouped fields */}
      {ungroupedFields.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <dl className="divide-y">
              {ungroupedFields.map((field) => (
                <div key={field.key} className={compact ? 'px-3' : 'px-5'}>
                  <FieldRow field={field} value={item[field.key]} t={tFn} compact={compact} />
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Grouped fields */}
      {groups.map((group) => {
        const fields = groupFieldMap.get(group.id)
        if (!fields || fields.length === 0) return null
        return (
          <FieldGroupSection key={group.id} group={group} fields={fields} item={item} compact={compact} />
        )
      })}

      {/* Catch any grouped fields without a matching FieldGroup definition */}
      {Array.from(groupFieldMap.entries()).map(([groupId, fields]) => {
        if (groups.some((g) => g.id === groupId)) return null
        return (
          <FieldGroupSection
            key={groupId}
            group={{ id: groupId, label: groupId.charAt(0).toUpperCase() + groupId.slice(1) }}
            fields={fields}
            item={item}
            compact={compact}
          />
        )
      })}
    </div>
  )
}

function getArchetypeTabs(layout?: FormLayout, archetypeKind?: string): DetailTab[] {
  let tabs: DetailTab[]
  switch (layout) {
    case 'person':
      tabs = PERSON_DETAIL_TABS
      break
    case 'product':
      tabs = PRODUCT_DETAIL_TABS
      break
    case 'service':
      tabs = SERVICE_DETAIL_TABS
      break
    case 'location':
      tabs = LOCATION_DETAIL_TABS
      break
    case 'subject':
      tabs = SUBJECT_DETAIL_TABS
      break
    default:
      tabs = []
  }
  if (archetypeKind) {
    tabs = tabs.filter((tab) => !tab.visibleFor || tab.visibleFor.includes(archetypeKind))
  }
  return tabs
}

const TAB_ICONS: Record<string, LucideIcon> = {
  Shield, CalendarDays, FileText, Clock, Package, Users, DollarSign, MapPin, BarChart3, Briefcase, ShoppingBag,
}

export function CrudDetailPage({
  entityDef,
  item,
  namePlural,
  basePath,
  initialTab,
  onBack,
  onEdit,
  onDelete,
  feature,
  embedded,
}: CrudDetailPageProps) {
  const t = useTranslation()
  const displayField = entityDef.displayField ?? entityDef.fields[0]?.key ?? 'id'
  const displayValue = item[displayField] ?? 'Untitled'
  const subtitleValue = entityDef.subtitleField ? item[entityDef.subtitleField] : null
  const imageValue = entityDef.imageField ? item[entityDef.imageField] : null
  const initial = typeof displayValue === 'string' ? displayValue.charAt(0).toUpperCase() : '?'

  // Merge archetype tabs + custom entity tabs
  const archetypeTabs = getArchetypeTabs(entityDef.layout, entityDef.data?.archetypeKind)
  const customTabs = [...archetypeTabs, ...(entityDef.detailTabs ?? [])]
  const entityId = entityDef.name.toLowerCase().replace(/\s+/g, '-')
  const widgetZone = `${entityId}.detail.tabs`

  // Resolve initial tab — validate it exists, fallback to "overview"
  const validTabs = ['overview', ...customTabs.map((t) => t.id)]
  const activeTab = initialTab && validTabs.includes(initialTab) ? initialTab : 'overview'

  const handleTabChange = useCallback((value: string) => {
    if (embedded) return
    const detailPath = `${basePath}/${item.id}`
    const newHash = value === 'overview' ? detailPath : `${detailPath}/${value}`
    window.history.replaceState(null, '', `#${newHash}`)
  }, [basePath, item.id, embedded])

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      {/* Breadcrumb — hidden in embedded mode */}
      {!embedded && <Breadcrumb parent={namePlural} current={displayValue} onBack={onBack} />}

      {/* Hero */}
      <div className={`flex items-start ${embedded ? 'gap-3' : 'gap-5'}`}>
        {/* Avatar / Image */}
        {imageValue ? (
          <img
            src={imageValue}
            alt={displayValue}
            className={`shrink-0 object-cover shadow-sm ${embedded ? 'h-10 w-10 rounded-xl' : 'h-20 w-20 rounded-2xl'}`}
          />
        ) : (
          <div className={`flex shrink-0 items-center justify-center bg-primary/10 text-primary font-bold shadow-sm ${embedded ? 'h-10 w-10 rounded-xl text-sm' : 'h-20 w-20 rounded-2xl text-2xl'}`}>
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className={`font-bold text-foreground truncate ${embedded ? 'text-base' : 'text-2xl'}`}>{displayValue}</h1>
            {item.status && (
              <Badge variant="secondary" className="shrink-0">
                {typeof item.status === 'string' ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : item.status}
              </Badge>
            )}
            {item.is_active !== undefined && (
              <Badge variant={item.is_active ? 'default' : 'secondary'} className="shrink-0">
                {item.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            )}
          </div>
          {subtitleValue && (
            <p className={`text-muted-foreground mt-0.5 ${embedded ? 'text-xs' : ''}`}>{subtitleValue}</p>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <Button variant="outline" size={embedded ? 'xs' as any : 'sm'} onClick={onEdit} className={embedded ? 'h-7 px-2 text-xs gap-1' : ''}>
                <Edit className={embedded ? 'h-3 w-3' : 'h-4 w-4 mr-1.5'} />
                {t('common.edit')}
              </Button>
            )}
            {onDelete && (
              <Button variant="outline" size={embedded ? 'xs' as any : 'sm'} className={`text-destructive hover:text-destructive ${embedded ? 'h-7 w-7 p-0' : ''}`} onClick={onDelete}>
                <Trash2 className={embedded ? 'h-3 w-3' : 'h-4 w-4'} />
              </Button>
            )}
          </div>
        )}
      </div>

      {!embedded && <Separator />}

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <TabsList className={embedded ? 'h-8' : undefined}>
          <TabsTrigger value="overview" className={`gap-1.5 ${embedded ? 'text-xs px-2 py-1' : ''}`}>
            <Eye className={embedded ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            {t('common.overview')}
          </TabsTrigger>
          {customTabs.map((tab) => {
            const translated = t(`crud.tabs.${tab.id}`)
            const label = translated.startsWith('crud.tabs.') ? tab.label : translated
            const TabIcon = tab.icon ? (TAB_ICONS[tab.icon] ?? null) : null
            return (
              <TabsTrigger key={tab.id} value={tab.id} className={`gap-1.5 ${embedded ? 'text-xs px-2 py-1' : ''}`}>
                {TabIcon && <TabIcon className={embedded ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
                {label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="overview" className={embedded ? 'mt-2' : 'mt-4'}>
          <OverviewTab entityDef={entityDef} item={item} compact={embedded} />
        </TabsContent>

        {customTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4">
            {tab.component ? (
              React.createElement(tab.component, { item, entityDef, ...(tab.props ?? {}) })
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">{t('common.noContent')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Widget zone for plugin tab injection */}
      <WidgetSlot zone={widgetZone} />
    </div>
  )
}
