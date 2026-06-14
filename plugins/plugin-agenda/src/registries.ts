import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Holidays (saas_core.holidays — tenant-scoped)
// ---------------------------------------------------------------------------

const holidayEntity: EntityDef = {
  name: 'Holiday',
  namePlural: 'Holidays',
  icon: 'TreePalm',
  displayField: 'name',
  defaultSort: 'date',
  defaultSortDir: 'asc',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'date', label: 'Date', type: 'date', required: true, showInTable: true, sortable: true },
    { key: 'recurring', label: 'Recurring Annually', type: 'boolean', showInTable: true, defaultValue: false },
    { key: 'description', label: 'Description', type: 'text', showInTable: false },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: {
    table: 'holidays',
    schema: 'saas_core',
    tenantScoped: true,
  },
}

export const agendaRegistries: PluginRegistryDef[] = [
  {
    id: 'holidays',
    entity: holidayEntity,
    icon: 'TreePalm',
    description: 'Non-working days and recurring holidays',
  },
]
