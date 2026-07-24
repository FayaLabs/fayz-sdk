import React from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { ModulePage, type ModuleNavItem } from '@fayz-ai/ui'
import { useTranslation, useDataChanged } from '@fayz-ai/core'
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
import { BlogAdminView } from './views/blog/BlogAdminView'
import { BlogEntityForm } from './views/blog/BlogEntityForm'
import { buildBlogPostEntity, buildBlogCategoryEntity } from './data/blogEntities'

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
  if (config.modules.blog) {
    items.push({
      id: 'blog', label: config.labels.blog, icon: 'Newspaper',
      active: view === 'blog' || view === 'blog-new' || view.startsWith('blog-post:')
        || view === 'blog-cat-new' || view.startsWith('blog-cat:'),
      onClick: () => navigate('blog'),
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
    overview: 0, channels: 0, campaigns: 0, funnel: 0, 'landing-pages': 0, content: 0, blog: 0,
    'channel-detail': 1, 'content-post': 1, 'content-brief': 1,
    'blog-new': 1, 'blog-post': 1, 'blog-cat-new': 1, 'blog-cat': 1,
  }, 'overview')

  React.useEffect(() => { void store.getState().load() }, [store])

  // Agent RPC writes (createCampaign) land outside the provider — refresh past
  // its read cache when any agent write is announced.
  useDataChanged({ table: 'plg_marketing_campaigns' }, () => { void store.getState().refresh() }, [store])

  const isOverview = view === 'overview'
  const nav = buildNav(config, view, navigate)

  // Blog backoffice entities — one shared EntityDef each drives the list + form.
  const blogPostEntity = React.useMemo(() => buildBlogPostEntity(), [])
  const blogCategoryEntity = React.useMemo(() => buildBlogCategoryEntity(), [])

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
    { id: 'blog', render: () => <BlogAdminView navigate={navigate} /> },
    { id: 'blog-new', render: () => <BlogEntityForm entity={blogPostEntity} parentLabel={config.labels.blog} onDone={() => navigate('blog')} /> },
    { id: 'blog-post', render: ({ id }) => <BlogEntityForm entity={blogPostEntity} editId={id!} parentLabel={config.labels.blog} onDone={() => navigate('blog')} /> },
    { id: 'blog-cat-new', render: () => <BlogEntityForm entity={blogCategoryEntity} parentLabel={config.labels.blogCategories} onDone={() => navigate('blog')} /> },
    { id: 'blog-cat', render: ({ id }) => <BlogEntityForm entity={blogCategoryEntity} editId={id!} parentLabel={config.labels.blogCategories} onDone={() => navigate('blog')} /> },
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
