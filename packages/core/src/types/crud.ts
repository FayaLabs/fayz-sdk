import type React from 'react'
import type { EntityArchetype } from './entities'

export type FieldType =
  | 'text' | 'email' | 'phone' | 'url' | 'image'
  | 'number' | 'currency'
  | 'select' | 'multiselect' | 'segmented'
  | 'relation'
  | 'date' | 'datetime' | 'time'
  | 'boolean' | 'textarea' | 'markdown'
  | 'color' | 'computed'

/** Foreign-key source for a `relation` field: the option list is loaded from a
 *  table at runtime ({value→label}) so the stored value is a real id (e.g. a
 *  uuid), not a static string. Use for FK columns the user must pick from a
 *  seeded/managed table (e.g. payment_method_type_id → payment_method_types). */
export interface FieldRelation {
  /** Table to read options from (e.g. 'payment_method_types'). */
  table: string
  /** Column stored as the field value. Default 'id'. */
  valueField?: string
  /** Column shown as the option label. Default 'name'. */
  labelField?: string
  /** Scope options to the active tenant via tenant_id. Default true. */
  tenantScoped?: boolean
  /** Schema the table lives in (rarely needed now core is in public). Default public. */
  schema?: string
  /** Extra equality filters applied to the option query. */
  filter?: Record<string, unknown>
}

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
  /** Required for `relation` fields — where to load the option list from. */
  relation?: FieldRelation
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
  /** Renders an image slot to the left of the group's fields. Functional when
   *  the EntityDef supplies `image`; a plain placeholder otherwise. */
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
  /** Tab content component, or a registered component id (componentId) for a
   *  serializable EntityDef. Exactly one is expected. */
  component?: React.ComponentType<{ item: unknown; entityDef: EntityDef; [key: string]: unknown }>
  componentId?: string
  visibleFor?: string[]
  props?: Record<string, unknown>
  /** Only show this tab when a plugin has contributed a widget to this zone (e.g. a
   *  financial plugin enabling a per-person statement tab). Hidden when no widget. */
  requiresWidgetZone?: string
}

export type FormLayout = 'person' | 'product' | 'service' | 'location' | 'order' | 'subject' | 'generic'

/**
 * Makes a field group's `imageSlot` functional. Without this the slot renders as
 * a decorative placeholder — it always did, which is why product forms showed an
 * empty thumbnail even for products that have images.
 *
 * Upload needs the record to exist (the file is attached to its id), so the slot
 * stays read-only in create mode and becomes editable after the first save.
 */
export interface EntityImageConfig {
  // Rows are loosely typed here on purpose: EntityDef<T> is consumed as
  // EntityDef<Record<string, unknown>> by the generic CRUD machinery, and a
  // T-parameterised callback makes the whole EntityDef invariant in T.
  /** Current image URL for this record, if any. */
  get: (row: Record<string, any>) => string | undefined
  /** Persist a new image and return its URL. Omit to keep the slot read-only. */
  upload?: (file: File, row: Record<string, any>) => Promise<string>
  /** Remove the current image. Omit to hide the remove affordance. */
  remove?: (row: Record<string, any>) => Promise<void>
  /** Accepted mime types. Defaults to image/*. */
  accept?: string
}

export interface EntityDef<T = Record<string, unknown>> {
  name: string
  namePlural?: string
  icon: string
  layout?: FormLayout
  fields: FieldDef[]
  fieldGroups?: FieldGroup[]
  /** Wiring for the `imageSlot` of whichever field group declares one. */
  image?: EntityImageConfig
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
  /**
   * Plan quantity-limit key gating creation of this entity (matches a
   * `PlanEntitlements.limits` key + a `LimitDeclaration`). When set, the CRUD
   * engine gates the "+ New" button (LimitGate), guards the create-form submit
   * and the CSV import (useLimitGuard) against the plan cap, and invalidates the
   * live count after a successful create. Absent ⇒ no plan gating (RBAC only).
   */
  limitKey?: string
  /**
   * Permission required to READ this entity through the agent's generic data
   * primitives (searchRecords/queryData) — checked per TARGET at execution
   * time, so one generic tool still honors per-user access. Absent ⇒ readable
   * by any signed-in member (same as the CRUD list today).
   */
  permission?: { feature: string; action: string }
}
