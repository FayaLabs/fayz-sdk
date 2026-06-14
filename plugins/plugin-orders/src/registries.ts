import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'

const orderSourceEntity: EntityDef = {
  name: 'Order Source',
  namePlural: 'Order Sources',
  icon: 'Globe',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'icon', label: 'Icon', type: 'text', showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'order_sources', tenantScoped: true },
}

export const ordersRegistries: PluginRegistryDef[] = [
  {
    id: 'order-sources',
    entity: orderSourceEntity,
    icon: 'Globe',
    description: 'Order sources and delivery platforms',
    display: 'table',
    seedData: [
      { id: 'os-dine', name: 'Dine-in', icon: '🍽️', isActive: true },
      { id: 'os-takeout', name: 'Takeout', icon: '🥡', isActive: true },
      { id: 'os-ifood', name: 'iFood', icon: '🔴', isActive: true },
      { id: 'os-99food', name: '99Food', icon: '🟡', isActive: true },
    ],
  },
]
