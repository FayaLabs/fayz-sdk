import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'

const allergenEntity: EntityDef = {
  name: 'Allergen',
  namePlural: 'Allergens',
  icon: 'AlertTriangle',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'icon', label: 'Icon', type: 'text', showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'menu_allergens', tenantScoped: true },
}

const dietaryTagEntity: EntityDef = {
  name: 'Dietary Tag',
  namePlural: 'Dietary Tags',
  icon: 'Leaf',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'color', label: 'Color', type: 'text', showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'menu_dietary_tags', tenantScoped: true },
}

const modifierGroupEntity: EntityDef = {
  name: 'Modifier Group',
  namePlural: 'Modifier Groups',
  icon: 'ListPlus',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'minSelections', label: 'Min Selections', type: 'number', showInTable: true, defaultValue: 0 },
    { key: 'maxSelections', label: 'Max Selections', type: 'number', showInTable: true, defaultValue: 1 },
    { key: 'isRequired', label: 'Required', type: 'boolean', showInTable: true, defaultValue: false },
  ],
  data: { table: 'menu_modifier_groups', tenantScoped: true },
}

export const menuRegistries: PluginRegistryDef[] = [
  {
    id: 'allergens',
    entity: allergenEntity,
    icon: 'AlertTriangle',
    description: 'Allergen types for menu items',
    display: 'table',
    readOnly: true,
    seedData: [
      { id: 'a-gluten', name: 'Gluten', icon: '🌾', isActive: true },
      { id: 'a-dairy', name: 'Dairy', icon: '🥛', isActive: true },
      { id: 'a-nuts', name: 'Nuts', icon: '🥜', isActive: true },
      { id: 'a-shellfish', name: 'Shellfish', icon: '🦐', isActive: true },
      { id: 'a-eggs', name: 'Eggs', icon: '🥚', isActive: true },
      { id: 'a-soy', name: 'Soy', icon: '🫘', isActive: true },
    ],
  },
  {
    id: 'dietary-tags',
    entity: dietaryTagEntity,
    icon: 'Leaf',
    description: 'Dietary tags (vegan, vegetarian, etc.)',
    display: 'table',
    readOnly: true,
    seedData: [
      { id: 'dt-vegan', name: 'Vegan', color: 'green', isActive: true },
      { id: 'dt-vegetarian', name: 'Vegetarian', color: 'lime', isActive: true },
      { id: 'dt-gf', name: 'Gluten Free', color: 'amber', isActive: true },
    ],
  },
  {
    id: 'modifier-groups',
    entity: modifierGroupEntity,
    icon: 'ListPlus',
    description: 'Modifier groups for item customization',
    display: 'table',
  },
]
