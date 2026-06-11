import type { PluginScope, VerticalId } from '@fayz/core'
import type { CustomFormsDataProvider } from './data/types'

export interface CustomFormsPluginOptions {
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: CustomFormsDataProvider
  navSection?: 'main' | 'secondary' | 'settings'
  navPosition?: number
  labels?: Partial<CustomFormsLabels>
}

export interface CustomFormsLabels {
  pageTitle: string
  settingsLabel: string
  templates: string
  documents: string
  newTemplate: string
  addDocument: string
}

export interface CustomFormsConfig {
  labels: CustomFormsLabels
}

const DEFAULT_LABELS: CustomFormsLabels = {
  pageTitle: 'Custom Forms',
  settingsLabel: 'Forms & Documents',
  templates: 'Templates',
  documents: 'Documents',
  newTemplate: 'New Template',
  addDocument: 'Add Document',
}

export function resolveConfig(options?: CustomFormsPluginOptions): CustomFormsConfig {
  return {
    labels: { ...DEFAULT_LABELS, ...options?.labels },
  }
}
