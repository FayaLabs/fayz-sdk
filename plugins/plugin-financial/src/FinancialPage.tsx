import React, { useState, useCallback, useMemo } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { useTranslation } from '@fayz-ai/core'
import { ModulePage, PageTransition, type ModuleNavItem } from '@fayz-ai/ui'
import { FinancialContextProvider, type ResolvedFinancialConfig } from './FinancialContext'
import type { FinancialDataProvider } from './data/types'
import type { FinancialUIState } from './store'
import type { PluginRegistryDef, PluginQuickAction } from '@fayz-ai/core'
import { useModuleNavigation, ModuleActionBar, parseViewId, PluginSettingsPanel } from '@fayz-ai/saas'
import { SummaryView } from './views/SummaryView'
import { PayablesView } from './views/PayablesView'
import { ReceivablesView } from './views/ReceivablesView'
import { CashRegistersView } from './views/CashRegistersView'
import { StatementsView } from './views/StatementsView'
import { CommissionsView } from './views/CommissionsView'
import { CardsView } from './views/CardsView'
import { ReconciliationView } from './views/ReconciliationView'
import { FinancialGeneralSettings } from './components/FinancialGeneralSettings'
import { FinancialOnboarding } from './components/FinancialOnboarding'

// ---------------------------------------------------------------------------
// View intent — what subpage + mode to show
// ---------------------------------------------------------------------------

export interface ViewIntent {
  view: string
  mode?: 'list' | 'new' | 'edit' | 'detail'
  editId?: string
}

function parseIntent(activeView: string): ViewIntent {
  // `base` collapses 'payables-detail' / 'payables-edit' etc; `id` is the canonical :id param.
  const { base, id } = parseViewId(activeView)
  const m = base.match(/^(payables|receivables)-(new|list|detail|edit)$/)
  if (m) return { view: m[1], mode: m[2] as ViewIntent['mode'], editId: id }
  return { view: activeView }
}

// ---------------------------------------------------------------------------
// Nav builder
// ---------------------------------------------------------------------------

function buildNav(
  config: ResolvedFinancialConfig,
  activeView: string,
  navigate: (view: string, hash?: string) => void,
  t: (key: string, params?: Record<string, string | number>) => string,
): ModuleNavItem[] {
  const items: ModuleNavItem[] = [
    {
      id: 'summary',
      label: t('financial.nav.summary'),
      icon: 'BarChart3',
      active: activeView === 'summary',
      onClick: () => navigate('summary'),
    },
  ]

  if (config.modules.payables) {
    items.push({
      id: 'payables',
      label: t('financial.nav.payables'),
      icon: 'ArrowUpCircle',
      active: activeView.startsWith('payables'),
      children: [
        { id: 'payables-new', label: t('financial.nav.new'), active: activeView === 'payables-new', onClick: () => navigate('payables-new') },
        { id: 'payables-list', label: t('financial.nav.list'), active: activeView === 'payables-list', onClick: () => navigate('payables-list') },
        { id: 'payables-recurring', label: t('financial.nav.recurringExpenses'), active: activeView === 'payables-recurring', onClick: () => navigate('payables-recurring') },
      ],
    })
  }

  if (config.modules.receivables) {
    items.push({
      id: 'receivables',
      label: t('financial.nav.receivables'),
      icon: 'ArrowDownCircle',
      active: activeView.startsWith('receivables'),
      children: [
        { id: 'receivables-new', label: t('financial.nav.new'), active: activeView === 'receivables-new', onClick: () => navigate('receivables-new') },
        { id: 'receivables-list', label: t('financial.nav.list'), active: activeView === 'receivables-list', onClick: () => navigate('receivables-list') },
      ],
    })
  }

  if (config.modules.cashRegisters) {
    items.push({
      id: 'cash-registers',
      label: t('financial.nav.cashRegisters'),
      icon: 'Landmark',
      active: activeView === 'cash-registers',
      onClick: () => navigate('cash-registers'),
    })
  }

  // Statements (extract) is core to the financial module — always shown, not gated per app.
  items.push({
    id: 'statements',
    label: t('financial.nav.statements'),
    icon: 'Receipt',
    active: activeView === 'statements',
    onClick: () => navigate('statements'),
  })

  if (config.modules.reconciliation) {
    items.push({
      id: 'reconciliation',
      label: t('financial.nav.reconciliation'),
      icon: 'ArrowLeftRight',
      active: activeView === 'reconciliation',
      onClick: () => navigate('reconciliation'),
    })
  }

  if (config.modules.commissions) {
    items.push({
      id: 'commissions',
      label: t('financial.nav.commissions'),
      icon: 'Users',
      children: [
        { id: 'commissions-overview', label: t('financial.nav.overview'), active: activeView === 'commissions', onClick: () => navigate('commissions') },
        { id: 'commissions-rules', label: t('financial.nav.rules'), active: activeView === 'commissions', onClick: () => navigate('commissions') },
      ],
    })
  }

  if (config.modules.cards) {
    items.push({
      id: 'cards',
      label: t('financial.nav.cards'),
      icon: 'CreditCard',
      children: [
        { id: 'cards-overview', label: t('financial.nav.overview'), active: activeView === 'cards', onClick: () => navigate('cards') },
        { id: 'cards-reconciliation', label: t('financial.nav.reconciliation'), active: activeView === 'cards', onClick: () => navigate('cards') },
      ],
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function FinancialPage({ config, provider, store, registries }: {
  config: ResolvedFinancialConfig
  provider: FinancialDataProvider
  store: StoreApi<FinancialUIState>
  registries?: PluginRegistryDef[]
}) {
  const { view, direction, navigate, previousView, back } = useModuleNavigation('/financial', {
    summary: 0,
    'payables-list': 0, 'payables-new': 1, 'receivables-list': 0, 'receivables-new': 1,
    'cash-registers': 0, statements: 0, reconciliation: 0, commissions: 0, cards: 0,
    settings: 1,
  })

  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    try { return localStorage.getItem('saas-core:financial-onboarded') === 'true' } catch { return false }
  })

  const t = useTranslation()
  const intent = parseIntent(view)
  const isSettings = view === 'settings'
  const nav = buildNav(config, view, navigate, t)

  const quickActions = useMemo<PluginQuickAction[]>(() => {
    const actions: PluginQuickAction[] = []
    if (config.modules.payables) {
      actions.push({
        id: 'new-payable',
        label: t('financial.quickActions.newPayable'),
        icon: 'ArrowUpCircle',
        description: t('financial.quickActions.newPayableDesc'),
        action: () => navigate('payables-new'),
      })
    }
    if (config.modules.receivables) {
      actions.push({
        id: 'new-receivable',
        label: t('financial.quickActions.newReceivable'),
        icon: 'ArrowDownCircle',
        description: t('financial.quickActions.newReceivableDesc'),
        action: () => navigate('receivables-new'),
      })
    }
    if (config.modules.cashRegisters) {
      actions.push({
        id: 'open-cash',
        label: t('financial.quickActions.openCashRegister'),
        icon: 'Landmark',
        description: t('financial.quickActions.openCashRegisterDesc'),
        action: () => navigate('cash-registers'),
      })
    }
    return actions
  }, [config.modules])

  function handleOnboardingComplete() {
    setOnboardingComplete(true)
    try { localStorage.setItem('saas-core:financial-onboarded', 'true') } catch {}
  }

  // Show onboarding on first visit
  if (!onboardingComplete) {
    return (
      <FinancialContextProvider config={config} provider={provider} store={store}>
        <FinancialOnboarding onComplete={handleOnboardingComplete} />
      </FinancialContextProvider>
    )
  }

  // Settings view
  if (isSettings && registries && registries.length > 0) {
    return (
      <FinancialContextProvider config={config} provider={provider} store={store}>
        <PageTransition transitionKey="settings" direction={direction}>
          <div style={{ padding: '24px' }}>
            <PluginSettingsPanel
              title={t('financial.settingsPage.title')}
              subtitle={t('financial.settingsPage.subtitle')}
              generalSettings={<FinancialGeneralSettings />}
              registries={registries}
              routeBase="/settings/financial"
            />
          </div>
        </PageTransition>
      </FinancialContextProvider>
    )
  }

  function renderView() {
    switch (intent.view) {
      case 'payables':
        return <PayablesView intent={intent} onNavigate={navigate} previousView={previousView} back={back} />
      case 'receivables':
        return <ReceivablesView intent={intent} onNavigate={navigate} previousView={previousView} back={back} />
      case 'cash-registers':
        return <CashRegistersView />
      case 'statements':
        return <StatementsView onNavigate={navigate} />
      case 'reconciliation':
        return <ReconciliationView />
      case 'commissions':
        return <CommissionsView />
      case 'cards':
        return <CardsView />
      default:
        return <SummaryView />
    }
  }

  return (
    <FinancialContextProvider config={config} provider={provider} store={store}>
      <ModulePage
        title={config.labels.pageTitle}
        subtitle={config.labels.pageSubtitle}
        nav={nav}
        showHeader={intent.view === 'summary' || view === 'summary'}
        viewKey={view}
        direction={direction}
        headerAction={
          <ModuleActionBar
            quickActions={quickActions}
            settingsPath={registries && registries.length > 0 ? '/settings/financial' : undefined}
            settingsLabel={t('financial.settingsPage.title')}
          />
        }
      >
        {renderView()}
      </ModulePage>
    </FinancialContextProvider>
  )
}
