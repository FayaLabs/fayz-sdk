import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'

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
    { key: 'color', label: 'Color', type: 'color', showInTable: true, defaultValue: '#6366f1' },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'crm_tags', tenantScoped: true },
}

const pipelineStageEntity: EntityDef = {
  name: 'Stage',
  namePlural: 'Stages',
  icon: 'Workflow',
  displayField: 'name',
  defaultSort: 'order',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true, searchable: true },
    {
      key: 'pipelineId',
      label: 'Pipeline',
      type: 'relation',
      relation: { table: 'pipelines', labelField: 'name' },
      required: true,
      showInTable: true,
    },
    { key: 'order', label: 'Order', type: 'number', required: true, showInTable: true, defaultValue: 0 },
    { key: 'color', label: 'Color', type: 'color', showInTable: true, defaultValue: '#6366f1' },
    { key: 'probability', label: 'Probability %', type: 'number', min: 0, max: 100, showInTable: true, defaultValue: 0 },
    { key: 'isWon', label: 'Won Stage', type: 'boolean', showInTable: true, defaultValue: false },
    { key: 'isLost', label: 'Lost Stage', type: 'boolean', showInTable: true, defaultValue: false },
  ],
  data: { table: 'pipeline_stages', tenantScoped: true },
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
    id: 'stages',
    entity: pipelineStageEntity,
    icon: 'Workflow',
    description: 'Pipeline stages used by CRM deals',
    display: 'table',
    seedData: [
      { id: 'stage-new', pipelineId: 'pipe-default', name: 'New Lead', order: 1, color: '#64748b', probability: 10, isWon: false, isLost: false },
      { id: 'stage-qualified', pipelineId: 'pipe-default', name: 'Qualified', order: 2, color: '#3b82f6', probability: 30, isWon: false, isLost: false },
      { id: 'stage-proposal', pipelineId: 'pipe-default', name: 'Proposal', order: 3, color: '#8b5cf6', probability: 60, isWon: false, isLost: false },
      { id: 'stage-negotiation', pipelineId: 'pipe-default', name: 'Negotiation', order: 4, color: '#f59e0b', probability: 80, isWon: false, isLost: false },
      { id: 'stage-won', pipelineId: 'pipe-default', name: 'Won', order: 5, color: '#10b981', probability: 100, isWon: true, isLost: false },
      { id: 'stage-lost', pipelineId: 'pipe-default', name: 'Lost', order: 6, color: '#ef4444', probability: 0, isWon: false, isLost: true },
    ],
  },
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
