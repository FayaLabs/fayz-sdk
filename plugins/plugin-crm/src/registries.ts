import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'
import { T } from './data/tables'

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
  data: { table: T.leadSources, tenantScoped: true },
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
  data: { table: T.tags, tenantScoped: true },
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
      relation: { table: T.pipelines, labelField: 'name' },
      required: true,
      showInTable: true,
    },
    { key: 'order', label: 'Order', type: 'number', required: true, showInTable: true, defaultValue: 0 },
    { key: 'color', label: 'Color', type: 'color', showInTable: true, defaultValue: '#6366f1' },
    { key: 'probability', label: 'Probability %', type: 'number', min: 0, max: 100, showInTable: true, defaultValue: 0 },
    { key: 'isWon', label: 'Won Stage', type: 'boolean', showInTable: true, defaultValue: false },
    { key: 'isLost', label: 'Lost Stage', type: 'boolean', showInTable: true, defaultValue: false },
  ],
  data: { table: T.pipelineStages, tenantScoped: true },
}

const activityTypeEntity: EntityDef = {
  name: 'Activity Type',
  namePlural: 'Activity Types',
  icon: 'MessageCircle',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'icon', label: 'Icon', type: 'text', showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true, inlineToggle: true },
  ],
  data: { table: T.activityTypes, tenantScoped: true },
}

export const DEFAULT_ACTIVITY_TYPES: Array<{ value: string; label: string; icon?: string }> = [
  { value: 'call', label: 'Call', icon: 'Phone' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'meeting', label: 'Meeting', icon: 'Users' },
  { value: 'note', label: 'Note', icon: 'FileText' },
  { value: 'task', label: 'Task', icon: 'CheckSquare' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
]

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
    // Tenant-editable (the provider lazily seeds the app's set per tenant);
    // system timeline events (lead_created, stage_changed…) are product-defined
    // and never appear here.
    seedData: [
      ...DEFAULT_ACTIVITY_TYPES.map((t) => ({ id: `at-${t.value}`, name: t.label, icon: t.icon, isActive: true })),
    ],
  },
]

/** Registries with the app's activity-type set replacing the default seed. */
export function buildCrmRegistries(
  activityTypes?: Array<{ value: string; label: string; icon?: string }>,
): PluginRegistryDef[] {
  if (!activityTypes?.length) return crmRegistries
  return crmRegistries.map((registry) =>
    registry.id === 'activity-types'
      ? {
          ...registry,
          seedData: [
            ...activityTypes.map((t) => ({ id: `at-${t.value}`, name: t.label, icon: t.icon, isActive: true })),
          ],
        }
      : registry,
  )
}
