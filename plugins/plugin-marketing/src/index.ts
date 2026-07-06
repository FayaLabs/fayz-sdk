import React from 'react'
import type { PluginManifest, PluginRegistryDef, PluginScope, VerticalId } from '@fayz-ai/core'
import { createSafeDataProvider, getSupabaseClientOptional, registerTranslations } from '@fayz-ai/core'
import { PluginSettingsPanel } from '@fayz-ai/saas'
import { MarketingPage } from './MarketingPage'
import { SettingsView } from './views/SettingsView'
import { buildMarketingRegistries } from './registries'
import { createMarketingDashboardWidgets } from './views/dashboardWidgets'
import {
  MarketingContextProvider,
  type ResolvedMarketingConfig,
  type MarketingLabels,
} from './MarketingContext'
import type {
  AttributionBridge,
  MarketingDataProvider,
  SitesPerformanceBridge,
} from './data/types'
import { createMockMarketingProvider } from './data/mock'
import type { ContentPlannerProvider } from './data/contentTypes'
import { createMockContentPlannerProvider } from './data/contentMock'
import { createSupabaseContentPlannerProvider } from './data/contentSupabase'
import { createMarketingStore } from './store'
import { createContentPlannerStore } from './views/content/contentStore'
import { MIGRATION_001_CONTENT_PLANNER, MIGRATION_002_MULTI_PLATFORM, MIGRATION_003_RECORDING_OPS } from './migrations'
import { DEFAULT_CURRENCY, type MarketingCurrency } from './format'
import { MARKETING_PRESETS, type MarketingDomain, type MarketingDomainModules } from './presets'
import type { AcquisitionChannel, ConversionModel } from './types'
import { marketingLocales } from './locales'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-marketing — acquisition & conversion analytics. ONE plugin,
// every vertical: a `domain` preset (or explicit conversion + channels) adapts
// what a conversion is and where it's attributed from. Channels, campaigns,
// funnel and landing-page CVR are computed generically.
//
// Ships a vertical-flavored mock today; real attribution comes via the
// AttributionBridge / SitesPerformanceBridge seams (read from crm/agenda/
// orders/sites). Outbound broadcasts + journeys are reserved behind flags.
// ---------------------------------------------------------------------------

export interface MarketingPluginOptions {
  /** Vertical preset for conversion model + channels + module defaults. */
  domain?: MarketingDomain
  /** Override the conversion model (else taken from the domain preset). */
  conversion?: ConversionModel
  /** Override the acquisition channels (else from the domain preset). */
  channels?: AcquisitionChannel[]
  modules?: Partial<MarketingDomainModules>
  currency?: Partial<MarketingCurrency>
  labels?: Partial<MarketingLabels>
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: MarketingDataProvider
  /** Content planner options (module toggled via `modules.contentPlanner`). */
  contentPlanner?: { dataProvider?: ContentPlannerProvider }
  /** App/vertical-owned settings registries rendered inside Marketing settings. */
  settingsRegistries?: PluginRegistryDef[]
  /** Optional DI to read real conversions (mounted later). */
  attributionBridge?: AttributionBridge
  /** Optional DI to read real landing-page performance (mounted later). */
  sitesBridge?: SitesPerformanceBridge
}

const DEFAULT_LABELS: MarketingLabels = {
  pageTitle: 'Marketing',
  pageSubtitle: 'Acquisition & conversion performance',
  overview: 'Overview',
  channels: 'Channels',
  campaigns: 'Campaigns',
  funnel: 'Funnel',
  landingPages: 'Landing pages',
  content: 'Content',
  settings: 'Settings',
}

function resolveConfig(options?: MarketingPluginOptions): { config: ResolvedMarketingConfig; domain: MarketingDomain } {
  const domain = options?.domain ?? 'agency'
  const preset = MARKETING_PRESETS[domain]
  const config: ResolvedMarketingConfig = {
    conversion: options?.conversion ?? preset.conversion,
    channels: options?.channels ?? preset.channels,
    modules: { ...preset.modules, ...options?.modules },
    currency: { ...DEFAULT_CURRENCY, ...options?.currency },
    labels: { ...DEFAULT_LABELS, ...options?.labels },
  }
  return { config, domain }
}

function createSafeProvider(config: ResolvedMarketingConfig, domain: MarketingDomain): MarketingDataProvider {
  // Supabase-backed + bridge-fed providers land later; mock powers it for now.
  void getSupabaseClientOptional()
  return createMockMarketingProvider({ channels: config.channels, conversion: config.conversion, domain })
}

export function createMarketingPlugin(options?: MarketingPluginOptions): PluginManifest {
  registerTranslations(marketingLocales)
  const { config, domain } = resolveConfig(options)
  const provider = options?.dataProvider ?? createSafeProvider(config, domain)
  const store = createMarketingStore(provider)
  const dashboardWidgets = createMarketingDashboardWidgets({ config, provider, store })

  // Content planner has its own provider seam: real Supabase CRUD (with mock
  // fallback) while the analytics provider stays mock-until-bridges.
  const contentProvider = options?.contentPlanner?.dataProvider ?? createSafeDataProvider(
    () => createSupabaseContentPlannerProvider(),
    () => createMockContentPlannerProvider(),
  )
  const contentStore = createContentPlannerStore(contentProvider)

  const PageComponent: React.ComponentType<unknown> = () =>
    React.createElement(MarketingContextProvider, { config, provider, store },
      React.createElement(MarketingPage, { config, provider, store, contentProvider, contentStore }))
  PageComponent.displayName = 'MarketingPage'

  // Settings lives in the SDK-core central Settings area (not a module tab).
  // General preferences (channel tracking toggles) + a Channels registry tab,
  // mirroring how plugin-menu surfaces Allergens.
  const marketingRegistries = [
    ...buildMarketingRegistries(config.channels),
    ...(options?.settingsRegistries ?? []),
  ]
  const SettingsComponent: React.ComponentType<unknown> = () =>
    React.createElement(MarketingContextProvider, { config, provider, store },
      React.createElement(PluginSettingsPanel, {
        title: config.labels.settings ?? config.labels.pageTitle,
        subtitle: config.labels.pageSubtitle,
        generalSettings: React.createElement(SettingsView),
        registries: marketingRegistries,
        routeBase: '/settings/marketing',
      }))
  SettingsComponent.displayName = 'MarketingSettings'

  return {
    id: 'marketing',
    name: options?.navLabel ?? config.labels.pageTitle,
    icon: 'Megaphone',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'marketing', label: config.labels.pageTitle, group: 'Engage' },
      ...(config.modules.landingPages ? [{ id: 'marketing.landing-pages', label: config.labels.landingPages, group: 'Engage' }] : []),
      ...(config.modules.contentPlanner ? [{ id: 'marketing.content', label: config.labels.content, group: 'Engage' }] : []),
    ],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 5,
        label: options?.navLabel ?? config.labels.pageTitle,
        route: '/marketing',
        icon: 'Megaphone',
        permission: { feature: 'marketing', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/marketing',
        component: PageComponent,
        permission: { feature: 'marketing', action: 'read' as const },
      },
    ],
    widgets: [],
    dashboardWidgets,
    events: [
      { name: 'marketing.conversion.tracked', description: 'A conversion was attributed to a channel/campaign' },
      { name: 'marketing.campaign.created', description: 'A campaign was created' },
      { name: 'marketing.campaign.updated', description: 'A campaign was updated' },
      { name: 'marketing.channel.synced', description: 'A channel pulled fresh attribution data' },
      { name: 'marketing.content.plan.updated', description: 'A content plan (brief/config) was updated' },
      { name: 'marketing.content.post.created', description: 'A content post was created' },
      { name: 'marketing.content.post.updated', description: 'A content post was updated' },
    ],
    migrations: [
      {
        id: 'marketing-001-content-planner',
        version: '1.0.0',
        sql: MIGRATION_001_CONTENT_PLANNER,
        description: 'Create mkt_social_accounts, mkt_content_plans and mkt_content_posts tables',
      },
      {
        id: 'marketing-002-multi-platform',
        version: '1.1.0',
        sql: MIGRATION_002_MULTI_PLATFORM,
        description: 'Accounts publish to many platforms (platforms[]); posts gain optional platform targets',
      },
      {
        id: 'marketing-003-recording-ops',
        version: '1.2.0',
        sql: MIGRATION_003_RECORDING_OPS,
        description: 'Recording-day checklist + media asset URL on posts; mkt-media storage bucket',
      },
    ],
    aiTools: [
      {
        id: 'marketing.channel-performance',
        name: 'channelPerformance',
        description: 'Returns acquisition performance per channel (reach, conversions, CVR, spend, CPA).',
        icon: 'Radio',
        mode: 'read' as const,
        category: 'Marketing',
        parameters: {
          type: 'object' as const,
          properties: { range: { type: 'string' as const, enum: ['7d', '30d', '90d'] } },
        },
        suggestions: [{ label: 'Which channel converts best?' }, { label: 'What is my cost per acquisition?' }],
        permission: { feature: 'marketing', action: 'read' as const },
      },
      {
        id: 'marketing.top-channels',
        name: 'topChannels',
        description: 'Returns the top acquisition channels ranked by conversions.',
        icon: 'Trophy',
        mode: 'read' as const,
        category: 'Marketing',
        permission: { feature: 'marketing', action: 'read' as const },
      },
      {
        id: 'marketing.campaign-cvr',
        name: 'campaignCvr',
        description: 'Lists campaigns with their conversion rate for a date range.',
        icon: 'Percent',
        mode: 'read' as const,
        category: 'Marketing',
        parameters: {
          type: 'object' as const,
          properties: { range: { type: 'string' as const, enum: ['7d', '30d', '90d'] } },
        },
        permission: { feature: 'marketing', action: 'read' as const },
      },
      {
        id: 'marketing.create-campaign',
        name: 'createCampaign',
        description: 'Creates an acquisition campaign on a channel.',
        icon: 'Plus',
        mode: 'persist' as const,
        category: 'Marketing',
        parameters: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const, description: 'Campaign name' },
            channelId: { type: 'string' as const, description: 'Acquisition channel id' },
          },
          required: ['name', 'channelId'],
        },
        permission: { feature: 'marketing', action: 'create' as const },
      },
    ],
    registries: marketingRegistries,
    settings: [
      {
        id: 'marketing',
        label: config.labels.pageTitle,
        icon: 'Megaphone',
        component: SettingsComponent,
        order: 20,
        permission: { feature: 'marketing', action: 'read' as const },
      },
    ],
    locales: marketingLocales,
  }
}

export type {
  MarketingDataProvider,
  AttributionBridge,
  SitesPerformanceBridge,
} from './data/types'
export type {
  AcquisitionChannel,
  ConversionModel,
  Campaign,
  ChannelPerformance,
  LandingPagePerf,
} from './types'
export { MARKETING_PRESETS, type MarketingDomain } from './presets'
export { createMockMarketingProvider } from './data/mock'
export type {
  ContentPlannerProvider,
  ContentPlan,
  ContentPost,
  SocialAccount,
  PostFormat,
  PostStatus,
  SaveContentPlanInput,
  SaveContentPostInput,
  SaveSocialAccountInput,
} from './data/contentTypes'
export { createMockContentPlannerProvider } from './data/contentMock'
export { createSupabaseContentPlannerProvider } from './data/contentSupabase'
