import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { ModulePage, type ModuleNavItem } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { PluginQuickAction } from '@fayz-ai/core'
import { useModuleNavigation, ModuleActionBar, createViewRouter } from '@fayz-ai/saas'
import { MarketingContextProvider, type ResolvedMarketingConfig } from './MarketingContext'
import type { MarketingDataProvider } from './data/types'
import type { ContentPlannerProvider } from './data/contentTypes'
import type { MarketingUIState } from './store'
import { OverviewView } from './views/OverviewView'
import { ChannelsView } from './views/ChannelsView'
import { ChannelDetailView } from './views/ChannelDetailView'
import { CampaignsView } from './views/CampaignsView'
import { FunnelView } from './views/FunnelView'
import { LandingPagesView } from './views/LandingPagesView'
import { ContentPlannerContextProvider } from './views/content/ContentPlannerContext'
import type { ContentPlannerUIState } from './views/content/contentStore'
import { ContentView } from './views/content/ContentView'
import { PostPage } from './views/content/PostPage'
import { PlanBriefView } from './views/content/PlanBriefView'

function buildNav(
  config: ResolvedMarketingConfig,
  view: string,
  navigate: (v: string) => void,
): ModuleNavItem[] {
  const items: ModuleNavItem[] = [
    { id: 'overview', label: config.labels.overview, icon: 'BarChart3', active: view === 'overview', onClick: () => navigate('overview') },
  ]
  if (config.modules.channels) {
    items.push({
      id: 'channels', label: config.labels.channels, icon: 'Radio',
      active: view === 'channels' || view.startsWith('channel-detail:'),
      onClick: () => navigate('channels'),
    })
  }
  if (config.modules.campaigns) {
    items.push({ id: 'campaigns', label: config.labels.campaigns, icon: 'Megaphone', active: view === 'campaigns', onClick: () => navigate('campaigns') })
  }
  if (config.modules.funnel) {
    items.push({ id: 'funnel', label: config.labels.funnel, icon: 'Filter', active: view === 'funnel', onClick: () => navigate('funnel') })
  }
  if (config.modules.landingPages) {
    items.push({ id: 'landing-pages', label: config.labels.landingPages, icon: 'LayoutTemplate', active: view === 'landing-pages', onClick: () => navigate('landing-pages') })
  }
  if (config.modules.contentPlanner) {
    items.push({
      id: 'content', label: config.labels.content, icon: 'Clapperboard',
      active: view === 'content' || view === 'content-brief' || view.startsWith('content-post:'),
      onClick: () => navigate('content'),
    })
  }
  return items
}

export function MarketingPage({ config, provider, store, contentProvider, contentStore }: {
  config: ResolvedMarketingConfig
  provider: MarketingDataProvider
  store: StoreApi<MarketingUIState>
  contentProvider: ContentPlannerProvider
  contentStore: StoreApi<ContentPlannerUIState>
}) {
  const t = useTranslation()
  const { view, direction, navigate } = useModuleNavigation('/marketing', {
    overview: 0, channels: 0, campaigns: 0, funnel: 0, 'landing-pages': 0, content: 0,
    'channel-detail': 1, 'content-post': 1, 'content-brief': 1,
  }, 'overview')

  React.useEffect(() => { void store.getState().load() }, [store])

  const isOverview = view === 'overview'
  const nav = buildNav(config, view, navigate)

  const quickActions = React.useMemo<PluginQuickAction[]>(() => [
    { id: 'new-campaign', label: t('marketing.campaigns.new'), icon: 'Megaphone', description: config.labels.campaigns, action: () => navigate('campaigns') },
  ], [t, config.labels.campaigns])

  const renderView = createViewRouter([
    { id: 'channels', render: () => <ChannelsView onOpen={(id) => navigate(`channel-detail:${id}`)} /> },
    { id: 'channel-detail', render: ({ id }) => <ChannelDetailView channelId={id!} onBack={() => navigate('channels')} /> },
    { id: 'campaigns', render: () => <CampaignsView /> },
    { id: 'funnel', render: () => <FunnelView /> },
    { id: 'landing-pages', render: () => <LandingPagesView /> },
    { id: 'content', render: () => <ContentView onOpenPost={(id) => navigate(`content-post:${id}`)} /> },
    { id: 'content-post', render: ({ id }) => <PostPage postId={id!} onBack={() => navigate('content')} /> },
    { id: 'content-brief', render: () => <PlanBriefView onBack={() => navigate('content')} /> },
    { id: 'overview', render: () => <OverviewView /> },
  ], 'overview')

  return (
    <MarketingContextProvider config={config} provider={provider} store={store}>
      <ContentPlannerContextProvider config={config} provider={contentProvider} store={contentStore}>
      <ModulePage
        title={config.labels.pageTitle}
        subtitle={config.labels.pageSubtitle}
        nav={nav}
        showHeader={isOverview}
        viewKey={view}
        direction={direction}
        headerAction={
          <ModuleActionBar
            quickActions={quickActions}
            settingsPath="/settings/marketing"
            settingsLabel={config.labels.pageTitle}
          />
        }
      >
        {renderView(view)}
      </ModulePage>
      </ContentPlannerContextProvider>
    </MarketingContextProvider>
  )
}
