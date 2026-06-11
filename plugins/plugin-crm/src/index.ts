import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz/core'
import type { EntityLookupMap } from '@fayz/saas'
import { CrmPage } from './CrmPage'
import { CrmContextProvider, type ResolvedCrmConfig } from './CrmContext'
import type { CrmDataProvider } from './data/types'
import { createMockCrmProvider } from './data/mock'
import { getSupabaseClientOptional, registerTranslations } from '@fayz/core'

function createSafeCrmProvider(providerOptions?: {
  clientConversion?: { archetypeKind: string; extensionTable: string; fkColumn: string }
}): CrmDataProvider {
  let resolved: CrmDataProvider | null = null
  function get(): CrmDataProvider {
    if (!resolved) resolved = getSupabaseClientOptional() ? createSupabaseCrmProvider(providerOptions) : createMockCrmProvider()
    return resolved
  }
  return new Proxy({} as CrmDataProvider, {
    get: (_, prop) => (...args: any[]) => (get() as any)[prop](...args),
  })
}
import { createSupabaseCrmProvider } from './data/supabase'
import { createCrmStore } from './store'
import { crmRegistries } from './registries'
import { crmLocales } from './locales'
import { CrmGeneralSettings } from './components/CrmGeneralSettings'
import { PipelineSettings } from './components/PipelineSettings'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CrmPluginLabels {
  pageTitle: string
  pageSubtitle: string
  dashboard: string
  pipeline: string
  leads: string
  leadsNew: string
  leadsList: string
  deals: string
  quotes: string
  quotesNew: string
  quotesList: string
  activities: string
}

export interface CrmPluginOptions {
  modules?: {
    quotes?: boolean
    activities?: boolean
    pipeline?: boolean
  }
  labels?: Partial<CrmPluginLabels>
  currency?: { code?: string; locale?: string; symbol?: string }
  leadSources?: Array<{ value: string; label: string }>
  dealStages?: Array<{ name: string; color: string; probability: number }>
  activityTypes?: Array<{ value: string; label: string; icon?: string }>
  itemTypes?: Array<{ value: string; label: string }>
  dataProvider?: CrmDataProvider
  navPosition?: number
  navSection?: 'main' | 'secondary'
  scope?: PluginScope
  verticalId?: VerticalId
  /** Entity lookups for cross-plugin references (e.g., product/service search in quotes) */
  entityLookups?: EntityLookupMap
  /** Contact/person lookup for client search in quotes and leads */
  contactLookup?: import('@fayz/saas').EntityLookup
  /** Client conversion config — when a lead is approved, CRM converts the person
   *  to a client by updating `persons.kind` and creating the extension table record.
   *  @example { archetypeKind: 'customer', extensionTable: 'clients', fkColumn: 'person_id' } */
  clientConversion?: {
    /** The archetype kind to set on persons.kind (e.g., 'customer') */
    archetypeKind: string
    /** Extension table name (e.g., 'clients') in public schema */
    extensionTable: string
    /** FK column pointing to persons.id (e.g., 'person_id') */
    fkColumn: string
  }
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: CrmPluginLabels = {
  pageTitle: 'Sales',
  pageSubtitle: 'CRM, leads, deals, and pipeline management',
  dashboard: 'Dashboard',
  pipeline: 'Pipeline',
  leads: 'Leads',
  leadsNew: 'New',
  leadsList: 'List',
  deals: 'Deals',
  quotes: 'Quotes',
  quotesNew: 'New',
  quotesList: 'List',
  activities: 'Activities',
}

const DEFAULT_CURRENCY = { code: 'BRL', locale: 'pt-BR', symbol: 'R$' }

const DEFAULT_ITEM_TYPES = [
  { value: 'service', label: 'Service' },
  { value: 'product', label: 'Product' },
  { value: 'other', label: 'Other' },
]

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: CrmPluginOptions): ResolvedCrmConfig {
  return {
    modules: {
      quotes: options?.modules?.quotes !== false,
      activities: options?.modules?.activities !== false,
      pipeline: options?.modules?.pipeline !== false,
    },
    labels: { ...DEFAULT_LABELS, ...options?.labels },
    currency: { ...DEFAULT_CURRENCY, ...options?.currency },
    itemTypes: options?.itemTypes ?? DEFAULT_ITEM_TYPES,
    entityLookups: options?.entityLookups ?? {},
    contactLookup: options?.contactLookup,
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCrmPlugin(options?: CrmPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  registerTranslations(crmLocales)
  const provider = options?.dataProvider ?? createSafeCrmProvider({ clientConversion: options?.clientConversion })
  const store = createCrmStore(provider)

  const PageComponent: React.FC<any> = () =>
    React.createElement(CrmPage, { config, provider, store, registries: crmRegistries })

  return {
    id: 'crm',
    name: config.labels.pageTitle,
    icon: 'Filter',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'sales', label: config.labels.pageTitle, group: config.labels.pageTitle },
      { id: 'crm.leads', label: config.labels.leads, group: config.labels.pageTitle },
      { id: 'crm.quotes', label: config.labels.quotes, group: config.labels.pageTitle },
      { id: 'crm.pipeline', label: config.labels.pipeline, group: config.labels.pageTitle },
    ],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 5,
        label: config.labels.pageTitle,
        route: '/sales',
        icon: 'Filter',
        permission: { feature: 'sales', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/sales',
        component: PageComponent,
        permission: { feature: 'sales', action: 'read' as const },
      },
    ],
    widgets: [],
    aiTools: [
      {
        id: 'crm.count-customers',
        name: 'countCustomers',
        description: 'Returns the number of active customers/clients.',
        icon: 'Users',
        mode: 'read' as const,
        category: 'Sales',
        parameters: {
          type: 'object' as const,
          properties: {
            status: { type: 'string' as const, enum: ['active', 'inactive', 'all'] },
          },
        },
        suggestions: [
          { label: 'How many customers do we have?', verticalId: 'beauty' as const },
          { label: 'How many clients do we have?', verticalId: 'services' as const },
          { label: 'How many patients today?', verticalId: 'health' as const },
          { label: 'Who are my top customers?' },
        ],
        permission: { feature: 'sales', action: 'read' as const },
      },
      {
        id: 'crm.list-leads',
        name: 'listLeads',
        description: 'Lists leads with optional filters.',
        icon: 'Target',
        mode: 'read' as const,
        category: 'Sales',
        parameters: {
          type: 'object' as const,
          properties: {
            source: { type: 'string' as const, description: 'Lead source filter' },
            status: { type: 'string' as const, enum: ['new', 'contacted', 'qualified', 'lost'] },
          },
        },
        permission: { feature: 'sales', action: 'read' as const },
        suggestions: [
          { label: 'Show new leads from this week' },
          { label: 'Which leads need follow-up?' },
          { label: "What's our conversion rate?" },
        ],
      },
    ],
    registries: crmRegistries,
    settings: [
      {
        id: 'crm',
        label: 'Sales & CRM',
        icon: 'Filter',
        component: (() => {
          const Tab: React.FC = () =>
            React.createElement(CrmContextProvider, { config, provider, store },
              React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
                React.createElement(CrmGeneralSettings),
                React.createElement(PipelineSettings),
              ),
            )
          Tab.displayName = 'CrmSettingsTab'
          return Tab
        })() as unknown as React.ComponentType<unknown>,
        order: 12,
        permission: { feature: 'sales', action: 'read' as const },
      },
    ],
    locales: crmLocales,
  }
}

export type { CrmDataProvider } from './data/types'
export type { ResolvedCrmConfig } from './CrmContext'
