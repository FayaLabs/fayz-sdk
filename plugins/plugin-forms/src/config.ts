import type { PluginRegistryDef, PluginScope, VerticalId } from '@fayz-ai/core'
import type { CustomFormsDataProvider } from './data/types'

export interface CustomFormsPluginOptions {
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: CustomFormsDataProvider
  navSection?: 'main' | 'secondary' | 'settings'
  navPosition?: number
  labels?: Partial<CustomFormsLabels>
  /** App-owned registries shown inside Forms & Documents settings. */
  settingsRegistries?: PluginRegistryDef[]
}

export interface CustomFormsLabels {
  pageTitle: string
  settingsLabel: string
  settingsSubtitle: string
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
  settingsSubtitle: 'Create and manage custom forms for your business',
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
