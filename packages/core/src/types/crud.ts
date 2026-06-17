import type React from 'react'
import type { EntityArchetype } from './entities'

export type FieldType =
  | 'text' | 'email' | 'phone' | 'url' | 'image'
  | 'number' | 'currency'
  | 'select' | 'multiselect' | 'segmented'
  | 'date' | 'datetime' | 'time'
  | 'boolean' | 'textarea'
  | 'color' | 'computed'

/** Read-only display produced by a `computed` field's `compute()`. */
export interface ComputedFieldValue {
  display: string
  /** Drives the value colour (green / red / muted). Default: neutral. */
  tone?: 'positive' | 'negative' | 'neutral'
}

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  /** Small helper text shown under the field input. */
  hint?: string
  /** Options for `select` / `multiselect` / `segmented`. The optional
   *  `description` is shown under the label on `segmented` radio-cards. */
  options?: string[] | { label: string; value: string; description?: string }[]
  min?: number
  max?: number
  /** ISO currency code for `currency` fields (e.g. 'BRL'). */
  currency?: string
  /** Symbol/locale for the `currency` field's CurrencyInput. Default 'R$' / 'pt-BR'. */
  currencySymbol?: string
  currencyLocale?: string
  showInTable?: boolean
  showInForm?: boolean
  showInDetail?: boolean
  sortable?: boolean
  searchable?: boolean
  /** Custom cell renderer (code escape hatch). For a serializable EntityDef in
   *  an AppManifest, reference a registered cell renderer by id instead. */
  renderCell?: (value: unknown, row: unknown) => React.ReactNode
  renderCellId?: string
  /** Derives a read-only value from the other form values (for `computed`
   *  fields, e.g. margin). Returns null to render an em-dash. */
  compute?: (values: Record<string, unknown>) => ComputedFieldValue | null
  defaultValue?: unknown
  group?: string
  span?: 1 | 2
  inlineToggle?: boolean
}

export interface FieldGroup {
  id: string
  label: string
  description?: string
  columns?: 1 | 2 | 3
  /** Renders a decorative image slot to the left of the group's fields. */
  imageSlot?: boolean
}

export interface DetailTab {
  id: string
  label: string
  icon?: string
  /** Tab content component, or a registered component id (componentId) for a
   *  serializable EntityDef. Exactly one is expected. */
  component?: React.ComponentType<{ item: unknown; entityDef: EntityDef; [key: string]: unknown }>
  componentId?: string
  visibleFor?: string[]
  props?: Record<string, unknown>
}

export type FormLayout = 'person' | 'product' | 'service' | 'location' | 'order' | 'subject' | 'generic'

export interface EntityDef<T = Record<string, unknown>> {
  name: string
  namePlural?: string
  icon: string
  layout?: FormLayout
  fields: FieldDef[]
  fieldGroups?: FieldGroup[]
  detailTabs?: DetailTab[]
  data?: {
    table: string
    schema?: string
    tenantScoped?: boolean
    tenantIdColumn?: string
    searchColumns?: string[]
    selectColumns?: string
    columnMap?: Record<string, string>
    archetype?: EntityArchetype
    archetypeKind?: string
    filters?: Record<string, string>
    defaults?: Record<string, unknown>
    cacheTTL?: number
  }
  defaultSort?: string
  defaultSortDir?: 'asc' | 'desc'
  displayField?: string
  subtitleField?: string
  imageField?: string
  /** Faceted filters shown as pills below the list search box. Each references a
   *  field whose `options` supply the pills; an "All" pill clears the filter. */
  facets?: { field: string; allLabel?: string }[]
}
