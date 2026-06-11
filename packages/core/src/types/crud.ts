import type React from 'react'
import type { EntityArchetype } from './entities'

export type FieldType =
  | 'text' | 'email' | 'phone' | 'url' | 'image'
  | 'number' | 'currency'
  | 'select' | 'multiselect'
  | 'date' | 'datetime' | 'time'
  | 'boolean' | 'textarea'
  | 'color'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: string[] | { label: string; value: string }[]
  min?: number
  max?: number
  currency?: string
  showInTable?: boolean
  showInForm?: boolean
  showInDetail?: boolean
  sortable?: boolean
  searchable?: boolean
  /** Custom cell renderer (code escape hatch). For a serializable EntityDef in
   *  an AppManifest, reference a registered cell renderer by id instead. */
  renderCell?: (value: unknown, row: unknown) => React.ReactNode
  renderCellId?: string
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
}
