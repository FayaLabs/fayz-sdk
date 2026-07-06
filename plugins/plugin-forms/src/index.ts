import React from 'react'
import type { PluginManifest } from '@fayz-ai/core'
import type { CustomFormsDataProvider } from './data/types'
import { createMockFormsProvider } from './data/mock'
import { createSupabaseFormsProvider } from './data/supabase'
import { createSafeDataProvider, registerTranslations } from '@fayz-ai/core'
import { PluginSettingsPanel } from '@fayz-ai/saas'
import { createCustomFormsStore } from './store'
import { customFormsLocales } from './locales'
import { resolveConfig } from './config'
import type { CustomFormsPluginOptions } from './config'
import { CustomFormsSettingsTab } from './views/CustomFormsSettingsTab'
import { PersonDocumentsWidget as PersonDocumentsWidgetImpl } from './components/PersonDocumentsWidget'
import { registerDocumentTypeProvider } from './document-types'
import { FileText as FileTextIcon, Image as ImageIcon, Paperclip } from 'lucide-react'

function registerBuiltInProviders(formsProvider: CustomFormsDataProvider) {
  // Templates from custom_forms
  registerDocumentTypeProvider({
    id: 'custom_forms:templates',
    async getTypes() {
      try {
        const result = await formsProvider.getTemplates({})
        return result.data.map((tpl) => ({
          id: `template:${tpl.id}`,
          label: tpl.name,
          icon: FileTextIcon,
          group: 'Formulários',
          groupOrder: 10,
          order: 0,
          description: tpl.description,
          _templateId: tpl.id,
        })) as any[]
      } catch {
        return []
      }
    },
  })

  // Built-in file types
  registerDocumentTypeProvider({
    id: 'core:files',
    getTypes() {
      return [
        { id: 'core:image', label: 'Imagem', icon: ImageIcon, group: 'Arquivos', groupOrder: 90, order: 0 },
        { id: 'core:attachment', label: 'Anexo', icon: Paperclip, group: 'Arquivos', groupOrder: 90, order: 1 },
      ]
    },
  })
}

export type { CustomFormsPluginOptions }
export { registerDocumentTypeProvider, type DocumentTypeOption, type DocumentTypeProvider } from './document-types'

export function createCustomFormsPlugin(options?: CustomFormsPluginOptions): PluginManifest {
  registerTranslations(customFormsLocales)
  const config = resolveConfig(options)
  const provider = options?.dataProvider ?? createSafeDataProvider(
    () => createSupabaseFormsProvider(),
    () => createMockFormsProvider(),
  )
  const store = createCustomFormsStore(provider)

  // Register built-in document type providers
  registerBuiltInProviders(provider)


  const formRegistries: import('@fayz-ai/core').PluginRegistryDef[] = [
    {
      id: 'form-categories',
      entity: {
        name: 'Category',
        namePlural: 'Categories',
        icon: 'FolderOpen',
        displayField: 'name',
        defaultSort: 'sort_order',
        fields: [
          { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
          { key: 'icon', label: 'Icon', type: 'text' as const, showInTable: true },
          { key: 'color', label: 'Color', type: 'color' as const, showInTable: true },
          { key: 'sortOrder', label: 'Order', type: 'number' as const, showInTable: true, defaultValue: 0 },
          { key: 'isActive', label: 'Active', type: 'boolean' as const, showInTable: true, defaultValue: true, inlineToggle: true },
        ],
        data: {
          table: 'frm_categories',
          tenantScoped: true,
        },
      },
      icon: 'FolderOpen',
      description: 'Categories for organizing form templates',
      seedData: [
        { name: 'Anamnese', sortOrder: 1, isActive: true },
        { name: 'Evolução', sortOrder: 2, isActive: true },
        { name: 'Laudo', sortOrder: 3, isActive: true },
        { name: 'Contrato', sortOrder: 4, isActive: true },
        { name: 'Geral', sortOrder: 5, isActive: true },
      ],
    },
  ]

  const registries = [...formRegistries, ...(options?.settingsRegistries ?? [])]

  const SettingsComponent: React.FC = () =>
    React.createElement(PluginSettingsPanel, {
      title: config.labels.settingsLabel,
      subtitle: config.labels.settingsSubtitle,
      customTabs: [
        {
          id: 'forms',
          label: config.labels.pageTitle,
          icon: 'FileText',
          content: React.createElement(CustomFormsSettingsTab, { config, provider, store }),
        },
      ],
      registries,
      routeBase: '/settings/custom_forms',
      hostPluginId: 'custom_forms',
    })
  SettingsComponent.displayName = 'CustomFormsSettingsPanel'

  const PersonDocumentsWidget: React.FC<any> = (props: any) =>
    React.createElement(PersonDocumentsWidgetImpl, { ...props, config, provider, store })
  PersonDocumentsWidget.displayName = 'PersonDocumentsWidget'

  return {
    id: 'custom_forms',
    name: config.labels.pageTitle,
    icon: 'FileText',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'custom_forms', label: config.labels.pageTitle, group: config.labels.pageTitle },
    ],

    navigation: [],

    routes: [],

    settings: [
      {
        id: 'custom_forms',
        label: config.labels.settingsLabel,
        icon: 'FileText',
        component: SettingsComponent as unknown as React.ComponentType<unknown>,
        order: 15,
      },
    ],

    widgets: [
      {
        id: 'person-documents-tab',
        zone: 'person.detail.documents',
        component: PersonDocumentsWidget,
        order: 0,
      },
    ],

    registries,

    aiTools: [
      {
        id: 'custom_forms.list-templates',
        name: 'listFormTemplates',
        description: 'Lists available form templates for the current tenant.',
        icon: 'FileText',
        mode: 'read' as const,
        category: 'Forms',
        parameters: {
          type: 'object' as const,
          properties: {
            category: {
              type: 'string' as const,
              description: 'Filter by category: anamnesis, evolution, report, contract, general',
            },
          },
        },
        suggestions: [
          { label: 'What forms do we have?' },
          { label: 'Show me anamnesis templates' },
        ],
        permission: { feature: 'custom_forms', action: 'read' as const },
      },
      {
        id: 'custom_forms.list-documents',
        name: 'listDocuments',
        description: 'Lists filled documents, optionally filtered by person or status.',
        icon: 'FileText',
        mode: 'read' as const,
        category: 'Forms',
        parameters: {
          type: 'object' as const,
          properties: {
            personId: { type: 'string' as const, description: 'Person UUID to filter by' },
            status: {
              type: 'string' as const,
              description: 'Status filter: draft, completed, signed, archived',
            },
          },
        },
        suggestions: [
          { label: "Show this client's documents" },
        ],
        permission: { feature: 'custom_forms', action: 'read' as const },
      },
    ],

    locales: customFormsLocales,
  }
}
