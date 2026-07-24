import React from 'react'
import type { PluginManifest, PluginRegistryDef, PluginScope, VerticalId } from '@fayz-ai/core'
import { createSafeDataProvider, registerTranslations } from '@fayz-ai/core'
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
import { createSupabaseMarketingProvider } from './data/supabase'
import { T } from './data/tables'
import type { ContentPlannerProvider } from './data/contentTypes'
import { createMockContentPlannerProvider } from './data/contentMock'
import { createSupabaseContentPlannerProvider } from './data/contentSupabase'
import { createMarketingStore } from './store'
import { createContentPlannerStore } from './views/content/contentStore'
import { MIGRATION_000_PLG_RENAME, MIGRATION_001_CONTENT_PLANNER, MIGRATION_002_MULTI_PLATFORM, MIGRATION_003_RECORDING_OPS, MIGRATION_004_RANKLAYER, MIGRATION_005_ANALYTICS_BASE, MIGRATION_006_ANALYTICS_VIEWS, MIGRATION_007_AGENT_RPCS } from './migrations'
import { ranklayerConnectorDef } from './integrations/ranklayer/connectorDef'
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
  blog: 'Blog',
  blogCategories: 'Categorias',
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

function createSafeProvider(
  config: ResolvedMarketingConfig,
  domain: MarketingDomain,
  options?: MarketingPluginOptions,
): MarketingDataProvider {
  return createSafeDataProvider(
    () => createSupabaseMarketingProvider({
      channels: config.channels,
      conversion: config.conversion,
      attributionBridge: options?.attributionBridge,
      sitesBridge: options?.sitesBridge,
    }),
    () => createMockMarketingProvider({ channels: config.channels, conversion: config.conversion, domain }),
  )
}

export function createMarketingPlugin(options?: MarketingPluginOptions): PluginManifest {
  registerTranslations(marketingLocales)
  const { config, domain } = resolveConfig(options)
  const provider = options?.dataProvider ?? createSafeProvider(config, domain, options)
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
        // Enables the "Integrações" tab (renders manifest connectors for this host).
        hostPluginId: 'marketing',
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
    // Admin content-planning surface (campaigns, content calendar) — targets the
    // saas/admin Panel world, not the ecommerce storefront/operator console.
    scaffolds: ['saas'],
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'marketing', label: config.labels.pageTitle, group: 'Engage' },
      ...(config.modules.landingPages ? [{ id: 'marketing.landing-pages', label: config.labels.landingPages, group: 'Engage' }] : []),
      ...(config.modules.contentPlanner ? [{ id: 'marketing.content', label: config.labels.content, group: 'Engage' }] : []),
      ...(config.modules.blog ? [{ id: 'marketing.blog', label: config.labels.blog, group: 'Engage' }] : []),
    ],
    declaredLimits: [
      ...(config.modules.campaigns ? [{ key: 'campaigns_active', label: 'Active campaigns', table: T.campaigns }] : []),
      ...(config.modules.contentPlanner ? [{ key: 'content_posts_month', label: 'Content posts / month', table: 'plg_marketing_content_posts', period: 'month' as const }] : []),
      ...(config.modules.blog ? [{ key: 'blog_posts', label: 'Blog posts', table: 'plg_blog_posts' }] : []),
    ],
    // Read-models for the agent's data primitives (searchRecords/queryData) —
    // mirrors agenda's `agenda:appointments`. Keys are stable ASCII; fields are
    // the provider's camelCase output shape.
    queryEntities: [
      ...(config.modules.campaigns ? [{
        key: 'marketing:campaigns',
        writable: false,
        entity: {
          name: 'Campaign',
          namePlural: 'Campaigns',
          icon: 'Megaphone',
          permission: { feature: 'marketing', action: 'read' as const },
          fields: [
            { key: 'name', label: 'Name', type: 'text' as const, searchable: true },
            { key: 'channelKey', label: 'Channel', type: 'text' as const, searchable: true },
            { key: 'channelLabel', label: 'Channel label', type: 'text' as const },
            { key: 'status', label: 'Status', type: 'text' as const },
            { key: 'startsAt', label: 'Starts at', type: 'text' as const },
            { key: 'endsAt', label: 'Ends at', type: 'text' as const },
            { key: 'spend', label: 'Spend', type: 'number' as const },
            { key: 'createdAt', label: 'Created at', type: 'text' as const },
          ],
          data: {
            table: 'v_marketing_campaigns',
            tenantScoped: true,
            searchColumns: ['name', 'channel_key'],
          },
        },
      }] : []),
      ...(config.modules.channels ? [{
        key: 'marketing:channels',
        writable: false,
        entity: {
          name: 'Marketing channel',
          namePlural: 'Marketing channels',
          icon: 'Radio',
          permission: { feature: 'marketing', action: 'read' as const },
          fields: [
            { key: 'channelKey', label: 'Key', type: 'text' as const, searchable: true },
            { key: 'label', label: 'Channel', type: 'text' as const, searchable: true },
            { key: 'kind', label: 'Type', type: 'text' as const },
            { key: 'isActive', label: 'Active', type: 'boolean' as const },
            { key: 'monthlySpend', label: 'Monthly spend', type: 'number' as const },
          ],
          data: {
            table: 'v_marketing_channels',
            tenantScoped: true,
            searchColumns: ['label', 'channel_key'],
          },
        },
      }] : []),
      ...(config.modules.contentPlanner ? [{
        key: 'marketing:contentPosts',
        writable: false,
        entity: {
          name: 'Content post',
          namePlural: 'Content posts',
          icon: 'FileText',
          permission: { feature: 'marketing.content', action: 'read' as const },
          fields: [
            { key: 'title', label: 'Title', type: 'text' as const, searchable: true },
            { key: 'format', label: 'Format', type: 'text' as const },
            { key: 'status', label: 'Status', type: 'text' as const },
            { key: 'weekNumber', label: 'Week', type: 'number' as const },
            { key: 'scheduledDate', label: 'Scheduled date', type: 'text' as const },
            { key: 'hook', label: 'Hook', type: 'text' as const, searchable: true },
          ],
          data: {
            table: T.contentPosts,
            tenantScoped: true,
            searchColumns: ['title', 'hook'],
          },
        },
      }] : []),
    ],
    declaredRpcs: [
      ...(config.modules.campaigns ? [{
        name: 'agent_marketing_create_campaign',
        kind: 'write' as const,
        description:
          'Guarded campaign create: agent_guard (role→plan→campaigns_active cap), channel validated against the tenant channel set, audited.',
        audits: true,
      }] : []),
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
        id: 'marketing-000-plg-rename',
        version: '1.0.0',
        sql: MIGRATION_000_PLG_RENAME,
        description: 'Rename legacy mkt_* tables to plg_marketing_* in-place for pools provisioned before the industry-pool rename (guarded no-op on fresh pools)',
      },
      {
        id: 'marketing-001-content-planner',
        version: '1.0.0',
        sql: MIGRATION_001_CONTENT_PLANNER,
        description: 'Create plg_marketing_social_accounts, plg_marketing_content_plans and plg_marketing_content_posts',
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
        description: 'Recording-day checklist + media asset URL on posts; content-media storage bucket',
      },
      {
        id: 'marketing-004-ranklayer',
        version: '1.3.0',
        sql: MIGRATION_004_RANKLAYER,
        description: 'RankLayer connector state: plg_marketing_ranklayer_integrations + _sync_log (tenant RLS)',
      },
      {
        id: 'marketing-005-analytics-base',
        version: '1.4.0',
        sql: MIGRATION_005_ANALYTICS_BASE,
        description: 'Analytics base: plg_marketing_channels + plg_marketing_campaigns with canonical tenant RLS',
      },
      {
        id: 'marketing-006-analytics-views',
        version: '1.4.0',
        sql: MIGRATION_006_ANALYTICS_VIEWS,
        description: 'Read views v_marketing_channels/_campaigns + generic spine-only v_marketing_attribution',
      },
      {
        id: 'marketing-007-agent-rpcs',
        version: '1.4.0',
        sql: MIGRATION_007_AGENT_RPCS,
        description: 'agent_marketing_create_campaign — guarded, audited server-plane campaign create',
      },
    ],
    // RankLayer SEO connector — renders in the Integrações settings tab. Scaffold
    // (control plane only); the real sync lands via an external PR (RANKLAYER.md).
    connectors: [ranklayerConnectorDef],
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
        description:
          'Creates an acquisition campaign on a channel. Resolve the channel first via queryData/searchRecords on marketing channels (use its channel key). The user confirms before creating.',
        icon: 'Plus',
        mode: 'persist' as const,
        limitKey: 'campaigns_active',
        execution: { plane: 'server' as const, kind: 'rpc' as const, rpc: 'agent_marketing_create_campaign' },
        category: 'Marketing',
        parameters: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const, description: 'Campaign name' },
            channel_key: { type: 'string' as const, description: "Acquisition channel key (e.g. 'instagram') or its label" },
            status: { type: 'string' as const, enum: ['draft', 'active', 'paused'], description: 'Defaults to draft' },
            starts_at: { type: 'string' as const, description: 'ISO start date-time (defaults to now)' },
            ends_at: { type: 'string' as const, description: 'ISO end date-time (optional)' },
            spend: { type: 'number' as const, description: 'Planned/committed spend (optional)' },
          },
          required: ['name', 'channel_key'],
        },
        suggestions: [{ label: 'Create an Instagram campaign for this month' }],
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
export { createSupabaseMarketingProvider } from './data/supabase'
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
