import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'
import { T } from './data/tables'

const taskLabelEntity: EntityDef = {
  name: 'Task Label',
  namePlural: 'Task Labels',
  icon: 'Tag',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'color', label: 'Color', type: 'text', showInTable: true, defaultValue: '#6366f1' },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: T.labels, tenantScoped: true },
}

export const tasksRegistries: PluginRegistryDef[] = [
  {
    id: 'task-labels',
    entity: taskLabelEntity,
    icon: 'Tag',
    description: 'Labels for categorizing tasks',
    display: 'table',
    seedData: [
      { id: 'lbl-bug', name: 'Bug', color: '#ef4444', isActive: true },
      { id: 'lbl-feature', name: 'Feature', color: '#3b82f6', isActive: true },
      { id: 'lbl-urgent', name: 'Urgent', color: '#f59e0b', isActive: true },
      { id: 'lbl-personal', name: 'Personal', color: '#8b5cf6', isActive: true },
    ],
  },
]
