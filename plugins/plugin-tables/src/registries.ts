import type { PluginRegistryDef } from '@fayz/core'
import type { EntityDef } from '@fayz/core'

const zoneEntity: EntityDef = {
  name: 'Zone',
  namePlural: 'Zones',
  icon: 'MapPin',
  displayField: 'name',
  defaultSort: 'sortOrder',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'color', label: 'Color', type: 'text', showInTable: true },
    { key: 'sortOrder', label: 'Order', type: 'number', showInTable: true, defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'restaurant_zones', tenantScoped: true },
}

export const tablesRegistries: PluginRegistryDef[] = [
  {
    id: 'zones',
    entity: zoneEntity,
    icon: 'MapPin',
    description: 'Floor plan zones (indoor, outdoor, bar, etc.)',
    display: 'table',
    seedData: [
      { id: 'z-indoor', name: 'Indoor', color: '#3b82f6', sortOrder: 0, isActive: true },
      { id: 'z-outdoor', name: 'Outdoor', color: '#22c55e', sortOrder: 1, isActive: true },
      { id: 'z-bar', name: 'Bar', color: '#f59e0b', sortOrder: 2, isActive: true },
    ],
  },
]
