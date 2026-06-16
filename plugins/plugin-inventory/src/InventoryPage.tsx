import React, { useState, useMemo } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { ModulePage, PageTransition, type ModuleNavItem } from '@fayz-ai/ui'
import { InventoryContextProvider, type ResolvedInventoryConfig } from './InventoryContext'
import type { InventoryDataProvider } from './data/types'
import type { InventoryUIState } from './store'
import type { PluginRegistryDef, PluginQuickAction } from '@fayz-ai/core'
import { useModuleNavigation, ModuleActionBar, createViewRouter } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'
import { DashboardView } from './views/DashboardView'
import { ProductListView } from './views/ProductListView'
import { ProductFormView } from './views/ProductFormView'
import { StockMovementView } from './views/StockMovementView'
import { MovementHistoryView } from './views/MovementHistoryView'
import { RecipesView } from './views/RecipesView'
import { RecipeFormView } from './views/RecipeFormView'
import { RecipeDetailView } from './views/RecipeDetailView'
import { InventoryGeneralSettings } from './components/InventoryGeneralSettings'
import { InventoryOnboarding } from './components/InventoryOnboarding'

function buildNav(config: ResolvedInventoryConfig, view: string, navigate: (v: string) => void, t: (key: string) => string): ModuleNavItem[] {
  const items: ModuleNavItem[] = [
    { id: 'dashboard', label: t('inventory.nav.dashboard'), icon: 'BarChart3', active: view === 'dashboard', onClick: () => navigate('dashboard') },
    {
      id: 'products', label: t('inventory.nav.products'), icon: 'Package', active: view.startsWith('products'),
      children: [
        { id: 'products-new', label: t('inventory.nav.new'), active: view === 'products-new', onClick: () => navigate('products-new') },
        { id: 'products-list', label: t('inventory.nav.list'), active: view === 'products-list', onClick: () => navigate('products-list') },
      ],
    },
    {
      id: 'stock', label: t('inventory.nav.stock'), icon: 'ArrowUpCircle',
      children: [
        { id: 'stock-entry', label: t('inventory.nav.entry'), active: view === 'stock-entry', onClick: () => navigate('stock-entry') },
        { id: 'stock-exit', label: t('inventory.nav.exit'), active: view === 'stock-exit', onClick: () => navigate('stock-exit') },
        { id: 'stock-history', label: t('inventory.nav.history'), active: view === 'stock-history', onClick: () => navigate('stock-history') },
      ],
    },
  ]

  if (config.modules.recipes) {
    items.push({
      id: 'recipes', label: config.labels.recipes, icon: 'BookOpen',
      children: [
        { id: 'recipes-list', label: config.labels.recipesList, active: view === 'recipes-list' || view.startsWith('recipes-detail:'), onClick: () => navigate('recipes-list') },
        { id: 'recipes-new', label: config.labels.recipesNew, active: view === 'recipes-new', onClick: () => navigate('recipes-new') },
      ],
    })
  }

  return items
}

export function InventoryPage({ config, provider, store, registries }: {
  config: ResolvedInventoryConfig
  provider: InventoryDataProvider
  store: StoreApi<InventoryUIState>
  registries?: PluginRegistryDef[]
}) {
  const t = useTranslation()
  const { view, direction, navigate } = useModuleNavigation('/inventory', {
    dashboard: 0,
    'products-list': 0, 'products-new': 1,
    'stock-entry': 1, 'stock-exit': 1, 'stock-history': 0,
    'recipes-list': 0, 'recipes-new': 1, 'recipes-detail': 1,
    settings: 1,
  }, 'dashboard')

  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    try { return localStorage.getItem('saas-core:inventory-onboarded') === 'true' } catch { return false }
  })

  const isSettings = view === 'settings'
  const isSummary = view === 'dashboard' || view === ''
  const nav = buildNav(config, view, navigate, t)

  const quickActions = useMemo<PluginQuickAction[]>(() => {
    const actions: PluginQuickAction[] = [
      {
        id: 'new-product',
        label: t('inventory.quickActions.newProduct'),
        icon: 'Package',
        description: t('inventory.quickActions.newProductDesc'),
        action: () => navigate('products-new'),
      },
      {
        id: 'stock-entry',
        label: t('inventory.quickActions.stockEntry'),
        icon: 'ArrowUpRight',
        description: t('inventory.quickActions.stockEntryDesc'),
        action: () => navigate('stock-entry'),
      },
      {
        id: 'stock-exit',
        label: t('inventory.quickActions.stockExit'),
        icon: 'ArrowDownRight',
        description: t('inventory.quickActions.stockExitDesc'),
        action: () => navigate('stock-exit'),
      },
    ]
    return actions
  }, [])

  if (!onboardingComplete) {
    return (
      <InventoryContextProvider config={config} provider={provider} store={store}>
        <InventoryOnboarding onComplete={() => { setOnboardingComplete(true); try { localStorage.setItem('saas-core:inventory-onboarded', 'true') } catch {} }} />
      </InventoryContextProvider>
    )
  }

  if (isSettings && registries && registries.length > 0) {
    return (
      <InventoryContextProvider config={config} provider={provider} store={store}>
        <PageTransition transitionKey="settings" direction={direction}>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{t('inventory.settingsPage.title')}</h1>
              <p style={{ color: 'var(--muted-foreground, #6b7280)', margin: '4px 0 0', fontSize: '14px' }}>
                {t('inventory.settingsPage.subtitle')}
              </p>
            </div>
            <InventoryGeneralSettings />
          </div>
        </PageTransition>
      </InventoryContextProvider>
    )
  }

  const renderView = createViewRouter([
    { id: 'products-list', render: () => <ProductListView onNew={() => navigate('products-new')} onEdit={(id) => navigate(`products-edit:${id}`)} /> },
    { id: 'products-new', render: () => <ProductFormView onSaved={() => navigate('products-list')} /> },
    { id: 'products-edit', render: ({ id }) => <ProductFormView editId={id!} onSaved={() => navigate('products-list')} /> },
    { id: 'stock-entry', render: () => <StockMovementView defaultType="entry" onSaved={() => navigate('stock-history')} /> },
    { id: 'stock-exit', render: () => <StockMovementView defaultType="exit" onSaved={() => navigate('stock-history')} /> },
    { id: 'stock-history', render: () => <MovementHistoryView onViewDetail={(id) => navigate(`stock-detail:${id}`)} /> },
    { id: 'stock-detail', render: ({ id }) => {
      const movement = store.getState().movements.find((m) => m.id === id)
      return movement
        ? <StockMovementView defaultType={movement.movementType} viewMovement={movement} onSaved={() => navigate('stock-history')} />
        : <MovementHistoryView onViewDetail={(mid) => navigate(`stock-detail:${mid}`)} />
    } },
    { id: 'recipes-list', render: () => <RecipesView onNew={() => navigate('recipes-new')} onView={(id) => navigate(`recipes-detail:${id}`)} /> },
    { id: 'recipes-new', render: () => <RecipeFormView onSaved={(id) => id ? navigate(`recipes-detail:${id}`) : navigate('recipes-list')} /> },
    { id: 'recipes-detail', render: ({ id }) => <RecipeDetailView recipeId={id!} onBack={() => navigate('recipes-list')} /> },
    { id: 'dashboard', render: () => <DashboardView /> },
  ], 'dashboard')

  return (
    <InventoryContextProvider config={config} provider={provider} store={store}>
      <ModulePage
        title={config.labels.pageTitle}
        subtitle={config.labels.pageSubtitle}
        nav={nav}
        showHeader={isSummary}
        viewKey={view}
        direction={direction}
        headerAction={
          <ModuleActionBar
            quickActions={quickActions}
            settingsPath={registries && registries.length > 0 ? '/settings/inventory' : undefined}
            settingsLabel="Inventory Settings"
          />
        }
      >
        {renderView(view)}
      </ModulePage>
    </InventoryContextProvider>
  )
}
