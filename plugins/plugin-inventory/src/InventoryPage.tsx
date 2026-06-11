import React, { useState, useMemo } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { Settings } from 'lucide-react'
import { ModulePage, type ModuleNavItem } from '@fayz/ui'
import { InventoryContextProvider, type ResolvedInventoryConfig } from './InventoryContext'
import type { InventoryDataProvider } from './data/types'
import type { InventoryUIState } from './store'
import type { PluginRegistryDef, PluginQuickAction } from '@fayz/core'
import { useModuleNavigation } from '@fayz/saas'
import { useTranslation } from '@fayz/core'
import { QuickActionsButton } from '@fayz/saas'
import { Button } from '@fayz/ui'
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
  const { view, animationClass, navigate } = useModuleNavigation('/inventory', {
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
        <div key="settings" className={animationClass}>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{t('inventory.settingsPage.title')}</h1>
              <p style={{ color: 'var(--muted-foreground, #6b7280)', margin: '4px 0 0', fontSize: '14px' }}>
                {t('inventory.settingsPage.subtitle')}
              </p>
            </div>
            <InventoryGeneralSettings />
          </div>
        </div>
      </InventoryContextProvider>
    )
  }

  // Parse edit/detail intents from view like 'products-edit:uuid' or 'stock-detail:uuid'
  const editMatch = view.match(/^products-edit:(.+)$/)
  const editId = editMatch?.[1]
  const movementDetailMatch = view.match(/^stock-detail:(.+)$/)
  const movementDetailId = movementDetailMatch?.[1]

  function renderView() {
    if (editId) return <ProductFormView editId={editId} onSaved={() => navigate('products-list')} />

    if (movementDetailId) {
      // Find the movement in the store or fetch it
      const movements = store.getState().movements
      const movement = movements.find((m) => m.id === movementDetailId)
      if (movement) {
        return <StockMovementView defaultType={movement.movementType} viewMovement={movement} onSaved={() => navigate('stock-history')} />
      }
      // If not found, go back to history
      return <MovementHistoryView onViewDetail={(id) => navigate(`stock-detail:${id}`)} />
    }

    switch (view) {
      case 'products-list': return <ProductListView onNew={() => navigate('products-new')} onEdit={(id) => navigate(`products-edit:${id}`)} />
      case 'products-new': return <ProductFormView onSaved={() => navigate('products-list')} />
      case 'stock-entry': return <StockMovementView defaultType="entry" onSaved={() => navigate('stock-history')} />
      case 'stock-exit': return <StockMovementView defaultType="exit" onSaved={() => navigate('stock-history')} />
      case 'stock-history': return <MovementHistoryView onViewDetail={(id) => navigate(`stock-detail:${id}`)} />
      case 'recipes-list': return <RecipesView onNew={() => navigate('recipes-new')} onView={(id) => navigate(`recipes-detail:${id}`)} />
      case 'recipes-new': return <RecipeFormView onSaved={(id) => id ? navigate(`recipes-detail:${id}`) : navigate('recipes-list')} />
      default: {
        if (view.startsWith('recipes-detail:')) {
          const id = view.slice('recipes-detail:'.length)
          return <RecipeDetailView recipeId={id} onBack={() => navigate('recipes-list')} />
        }
        return <DashboardView />
      }
    }
  }

  return (
    <InventoryContextProvider config={config} provider={provider} store={store}>
      <ModulePage
        title={config.labels.pageTitle}
        subtitle={config.labels.pageSubtitle}
        nav={nav}
        showHeader={isSummary}
        headerAction={
          <div className="flex items-center gap-2">
            {quickActions.length > 0 && <QuickActionsButton actions={quickActions} />}
            {registries && registries.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => { window.location.hash = '/settings/inventory' }}
                title="Inventory Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      >
        <div key={view} className={animationClass}>
          {renderView()}
        </div>
      </ModulePage>
    </InventoryContextProvider>
  )
}
