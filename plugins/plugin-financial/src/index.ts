import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz/core'
import type { EntityLookupMap } from '@fayz/saas'
import { FinancialPage } from './FinancialPage'
import type { ResolvedFinancialConfig } from './FinancialContext'
import type { FinancialDataProvider } from './data/types'
import { createMockFinancialProvider } from './data/mock'
import { createSupabaseFinancialProvider } from './data/supabase'
import { getSupabaseClientOptional, registerTranslations } from '@fayz/core'

function createSafeFinancialProvider(): FinancialDataProvider {
  let resolved: FinancialDataProvider | null = null
  function get(): FinancialDataProvider {
    if (!resolved) resolved = getSupabaseClientOptional() ? createSupabaseFinancialProvider() : createMockFinancialProvider()
    return resolved
  }
  return new Proxy({} as FinancialDataProvider, {
    get: (_, prop) => (...args: any[]) => (get() as any)[prop](...args),
  })
}
import { createFinancialStore } from './store'
import { financialRegistries } from './registries'
import { financialLocales } from './locales'
import { FinancialGeneralSettings } from './components/FinancialGeneralSettings'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FinancialPluginLabels {
  pageTitle: string
  pageSubtitle: string
  summary: string
  payables: string
  payablesNew: string
  payablesList: string
  payablesRecurring: string
  receivables: string
  receivablesNew: string
  receivablesList: string
  cashRegisters: string
  statements: string
  commissions: string
  commissionsOverview: string
  commissionsRules: string
  cards: string
  cardsOverview: string
  cardsReconciliation: string
}

export interface ItemTypeOption {
  value: string
  label: string
  icon?: string
}

export interface FinancialPluginOptions {
  modules?: {
    payables?: boolean
    receivables?: boolean
    cashRegisters?: boolean
    statements?: boolean
    commissions?: boolean
    cards?: boolean
  }
  labels?: Partial<FinancialPluginLabels>
  currency?: {
    code?: string
    locale?: string
    symbol?: string
  }
  navPosition?: number
  navSection?: 'main' | 'secondary'
  scope?: PluginScope
  verticalId?: VerticalId

  /** Data provider. Defaults to mock (in-memory) if not supplied. */
  dataProvider?: FinancialDataProvider

  /** Available item types for invoice lines. Default: product + service + other */
  itemTypes?: ItemTypeOption[]

  /** Enable service execution tracking on invoice items (default: false) */
  enableServiceExecution?: boolean

  /** Contact entity config — which person kind to use */
  contactEntity?: { archetypeKind: string; label?: string }

  /** Seed payment method types for mock provider */
  paymentMethodTypes?: Array<{ name: string; transactionType?: string }>

  /** Business units / locations. Unit selector only shows when 2+ locations are provided. */
  locations?: Array<{ id: string; name: string; isHQ?: boolean }>

  /**
   * Entity lookups for cross-plugin references.
   * Keys match `itemTypes` values (e.g., 'product', 'service').
   * When a lookup is provided, item forms show a search selector for that type.
   * When absent, users type descriptions manually.
   */
  entityLookups?: EntityLookupMap

  /** Contact/person lookup for "Pay to" / "Receive from" fields. Queries persons archetype. */
  contactLookup?: import('@fayz/saas').EntityLookup

  /** Callback when user clicks a booking link on an invoice. Receives the order ID. */
  onBookingClick?: (orderId: string) => void
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: FinancialPluginLabels = {
  pageTitle: 'Financial',
  pageSubtitle: 'Financial overview and cash flow management',
  summary: 'Summary',
  payables: 'Accounts Payable',
  payablesNew: 'New',
  payablesList: 'List',
  payablesRecurring: 'Recurring Expenses',
  receivables: 'Accounts Receivable',
  receivablesNew: 'New',
  receivablesList: 'List',
  cashRegisters: 'Cash Registers',
  statements: 'Statements',
  commissions: 'Commissions',
  commissionsOverview: 'Overview',
  commissionsRules: 'Rules',
  cards: 'Cards',
  cardsOverview: 'Overview',
  cardsReconciliation: 'Reconciliation',
}

const DEFAULT_CURRENCY = { code: 'BRL', locale: 'pt-BR', symbol: 'R$' }

const DEFAULT_ITEM_TYPES: ItemTypeOption[] = [
  { value: 'service', label: 'Service', icon: 'Briefcase' },
  { value: 'product', label: 'Product', icon: 'Package' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
]

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: FinancialPluginOptions): ResolvedFinancialConfig {
  return {
    modules: {
      payables: options?.modules?.payables !== false,
      receivables: options?.modules?.receivables !== false,
      cashRegisters: options?.modules?.cashRegisters !== false,
      statements: options?.modules?.statements !== false,
      commissions: options?.modules?.commissions !== false,
      cards: options?.modules?.cards !== false,
    },
    labels: { ...DEFAULT_LABELS, ...options?.labels },
    currency: { ...DEFAULT_CURRENCY, ...options?.currency },
    itemTypes: options?.itemTypes ?? DEFAULT_ITEM_TYPES,
    enableServiceExecution: options?.enableServiceExecution ?? false,
    contactEntity: {
      archetypeKind: options?.contactEntity?.archetypeKind ?? 'client',
      label: options?.contactEntity?.label ?? 'Contact',
    },
    locations: options?.locations ?? [],
    entityLookups: options?.entityLookups ?? {},
    contactLookup: options?.contactLookup,
    onBookingClick: options?.onBookingClick,
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFinancialPlugin(options?: FinancialPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  registerTranslations(financialLocales)

  const provider = options?.dataProvider ?? createSafeFinancialProvider()
  const store = createFinancialStore(provider)

  const PageComponent: React.FC<any> = () =>
    React.createElement(FinancialPage, { config, provider, store, registries: financialRegistries })

  return {
    id: 'financial',
    name: config.labels.pageTitle,
    icon: 'DollarSign',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'financial', label: config.labels.pageTitle, group: config.labels.pageTitle },
      ...(config.modules.receivables ? [{ id: 'financial.receivables', label: config.labels.receivables, group: config.labels.pageTitle }] : []),
      ...(config.modules.payables ? [{ id: 'financial.payables', label: config.labels.payables, group: config.labels.pageTitle }] : []),
      ...(config.modules.commissions ? [{ id: 'financial.commissions', label: config.labels.commissions, group: config.labels.pageTitle }] : []),
    ],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 6,
        label: config.labels.pageTitle,
        route: '/financial',
        icon: 'DollarSign',
        permission: { feature: 'financial', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/financial',
        component: PageComponent,
        permission: { feature: 'financial', action: 'read' as const },
      },
    ],
    widgets: [],
    aiTools: [
      {
        id: 'financial.get-revenue',
        name: 'getRevenue',
        description: 'Returns revenue for the business in a given period.',
        icon: 'DollarSign',
        mode: 'read' as const,
        category: 'Finance',
        parameters: {
          type: 'object' as const,
          properties: {
            period: { type: 'string' as const, description: 'today, week, month, or custom date range' },
          },
        },
        suggestions: [
          { label: 'How much did we make today?' },
          { label: "What's this month's revenue?" },
          { label: "Compare this week's revenue to last week" },
        ],
      },
      {
        id: 'financial.create-invoice',
        name: 'createInvoice',
        description: 'Creates a new invoice/payable for a contact.',
        icon: 'FileText',
        mode: 'persist' as const,
        category: 'Finance',
        parameters: {
          type: 'object' as const,
          properties: {
            contact: { type: 'string' as const, description: 'Contact/customer name' },
            amount: { type: 'number' as const, description: 'Invoice amount' },
            description: { type: 'string' as const, description: 'Invoice description' },
          },
          required: ['contact', 'amount'],
        },
        suggestions: [
          { label: 'Create an invoice for a new client' },
        ],
        permission: { feature: 'financial', action: 'create' as const },
      },
      {
        id: 'financial.list-payables',
        name: 'listPayables',
        description: 'Lists outstanding payables/bills.',
        icon: 'FileDown',
        mode: 'read' as const,
        category: 'Finance',
        parameters: {
          type: 'object' as const,
          properties: {
            status: { type: 'string' as const, enum: ['pending', 'overdue', 'paid'] },
            contact: { type: 'string' as const, description: 'Filter by contact name' },
          },
        },
        permission: { feature: 'financial', action: 'read' as const },
        suggestions: [
          { label: 'Show me overdue bills' },
          { label: 'What bills are due this week?' },
        ],
      },
    ],
    registries: financialRegistries,
    settings: [
      {
        id: 'financial',
        label: 'Financial',
        icon: 'DollarSign',
        component: (() => {
          const FinancialSettingsTab: React.FC = () =>
            React.createElement(FinancialGeneralSettings)
          FinancialSettingsTab.displayName = 'FinancialSettingsTab'
          return FinancialSettingsTab as unknown as React.ComponentType<unknown>
        })(),
        order: 10,
        permission: { feature: 'financial', action: 'read' as const },
      },
    ],
    locales: financialLocales,
  }
}

// Re-export types and factories for consumers
export type { FinancialDataProvider } from './data/types'
export type { ResolvedFinancialConfig } from './FinancialContext'
export { createSafeFinancialProvider }
