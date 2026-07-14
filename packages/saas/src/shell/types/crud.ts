import type React from 'react'
import type { EntityArchetype } from './entities'

export type FieldType =
  | 'text' | 'email' | 'phone' | 'url' | 'image'
  | 'number' | 'currency'
  | 'select' | 'multiselect' | 'segmented'
  | 'relation'
  | 'date' | 'datetime' | 'time'
  | 'boolean' | 'textarea'
  | 'color' | 'computed'

/** Foreign-key source for a `relation` field (options loaded from a table). */
export interface FieldRelation {
  table: string
  valueField?: string
  labelField?: string
  tenantScoped?: boolean
  schema?: string
  filter?: Record<string, unknown>
}

/** Read-only display produced by a `computed` field's `compute()`. */
export interface ComputedFieldValue {
  display: string
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
  options?: string[] | { label: string; value: string; description?: string }[]
  /** Required for `relation` fields — where to load the option list from. */
  relation?: FieldRelation
  min?: number
  max?: number
  currency?: string
  /** Symbol/locale for the `currency` field's CurrencyInput. Default 'R$' / 'pt-BR'. */
  currencySymbol?: string
  currencyLocale?: string
  showInTable?: boolean
  showInForm?: boolean
  /** Show this field in the detail page overview (default: true) */
  showInDetail?: boolean
  sortable?: boolean
  searchable?: boolean
  renderCell?: (value: any, row: any) => React.ReactNode
  /** Derives a read-only value from the other form values (for `computed` fields). */
  compute?: (values: Record<string, any>) => ComputedFieldValue | null
  defaultValue?: any
  /** Field group name — groups fields into sections in forms and detail views */
  group?: string
  /** Column span in two-column layout: 1 (half) or 2 (full width). Default: 1 */
  span?: 1 | 2
  /** For boolean fields: render as inline toggle in the table, allowing direct toggling without editing */
  inlineToggle?: boolean
}

export interface FieldGroup {
  id: string
  label: string
  description?: string
  /** Number of columns for this group (default: 2) */
  columns?: 1 | 2 | 3
  /** Renders a decorative image slot to the left of the group's fields. */
  imageSlot?: boolean
}

export interface DetailTab {
  id: string
  label: string
  icon?: string
  /** Legacy or compatibility route ids that should resolve to this tab. */
  aliases?: string[]
  /** Hide an inherited/archetype tab while still allowing the app to override it by id. */
  hidden?: boolean
  /** React component to render as tab content. Receives { item, entityDef, ...props } —
   * extra required props can be supplied via the `props` field below. */
  component?: React.ComponentType<any>
  /** Restrict tab visibility to specific archetypeKind values. If omitted, tab shows for all. */
  visibleFor?: string[]
  /** Extra props passed through to the tab component */
  props?: Record<string, unknown>
}

export type FormLayout = 'person' | 'product' | 'service' | 'location' | 'order' | 'subject' | 'generic'

export interface EntityDef<T = Record<string, any>> {
  name: string
  namePlural?: string
  icon: string
  /** Form/detail layout preset. Determines the archetype-specific form layout. */
  layout?: FormLayout
  fields: FieldDef[]
  /** Named groups for organizing fields in forms and detail views */
  fieldGroups?: FieldGroup[]
  /** Custom tabs on the detail page (in addition to Overview) */
  detailTabs?: DetailTab[]
  data?: {
    table: string
    schema?: string
    tenantScoped?: boolean
    tenantIdColumn?: string
    searchColumns?: string[]
    selectColumns?: string
    columnMap?: Record<string, string>
    /** Which public-schema archetype this entity extends (requires a project extension table) */
    archetype?: EntityArchetype
    /** The `kind` discriminator value for the archetype table */
    archetypeKind?: string
    /** Static filters applied to all queries (e.g. { kind: 'supplier' }) */
    filters?: Record<string, string>
    /** Default values merged into every create payload */
    defaults?: Record<string, unknown>
    /** Cache TTL in ms for list queries (default: 60 000 — 1 minute) */
    cacheTTL?: number
  }
  defaultSort?: string
  defaultSortDir?: 'asc' | 'desc'
  displayField?: string
  /** Secondary field shown below the display field in detail hero (e.g., email) */
  subtitleField?: string
  /** Field key containing an image URL — shown as hero image on card layout and detail avatar */
  imageField?: string
  /** Faceted filters shown as pills below the list search box. Each references a
   *  field whose `options` supply the pills; an "All" pill clears the filter. */
  facets?: { field: string; allLabel?: string }[]
}

// ---------------------------------------------------------------------------
// Tenant-level field rule overrides
// ---------------------------------------------------------------------------

/** Per-field override configured by tenant admin */
export interface FieldRuleOverride {
  required?: boolean
  showInForm?: boolean
  showInTable?: boolean
  showInDetail?: boolean
}

/** Field overrides for a single register type, keyed by field.key */
export type EntityFieldRules = Record<string, FieldRuleOverride>

/** All field rules for a tenant, keyed by entityKey (e.g. "person:client", "product") */
export type TenantFieldRules = Record<string, EntityFieldRules>
