import type { PluginRegistryDef, EntityDef } from '@fayz/core'

const leadSourceEntity: EntityDef = {
  name: 'Lead Source',
  namePlural: 'Lead Sources',
  icon: 'Globe',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'lead_sources', tenantScoped: true },
}

const tagEntity: EntityDef = {
  name: 'Tag',
  namePlural: 'Tags',
  icon: 'Tag',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'color', label: 'Color', type: 'text', showInTable: true, defaultValue: '#6366f1' },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'crm_tags', tenantScoped: true },
}

const activityTypeEntity: EntityDef = {
  name: 'Activity Type',
  namePlural: 'Activity Types',
  icon: 'MessageCircle',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'crm_activity_types', tenantScoped: true },
}

export const crmRegistries: PluginRegistryDef[] = [
  {
    id: 'lead-sources',
    entity: leadSourceEntity,
    icon: 'Globe',
    description: 'Where your leads come from',
    display: 'table',
    seedData: [
      { id: 'src-instagram', name: 'Instagram', isActive: true },
      { id: 'src-whatsapp', name: 'WhatsApp', isActive: true },
      { id: 'src-referral', name: 'Referral', isActive: true },
      { id: 'src-google', name: 'Google', isActive: true },
      { id: 'src-website', name: 'Website', isActive: true },
      { id: 'src-walkin', name: 'Walk-in', isActive: true },
    ],
  },
  {
    id: 'tags',
    entity: tagEntity,
    icon: 'Tag',
    description: 'Tags for organizing leads and deals',
    display: 'table',
    seedData: [
      { id: 'tag-vip', name: 'VIP', color: '#f59e0b', isActive: true },
      { id: 'tag-hot', name: 'Hot Lead', color: '#ef4444', isActive: true },
      { id: 'tag-followup', name: 'Follow-up', color: '#3b82f6', isActive: true },
    ],
  },
  {
    id: 'activity-types',
    entity: activityTypeEntity,
    icon: 'MessageCircle',
    description: 'Types of activities and interactions',
    display: 'table',
    readOnly: true,
    seedData: [
      { id: 'at-call', name: 'Call', isActive: true },
      { id: 'at-email', name: 'Email', isActive: true },
      { id: 'at-meeting', name: 'Meeting', isActive: true },
      { id: 'at-note', name: 'Note', isActive: true },
      { id: 'at-task', name: 'Task', isActive: true },
      { id: 'at-whatsapp', name: 'WhatsApp', isActive: true },
    ],
  },
]
