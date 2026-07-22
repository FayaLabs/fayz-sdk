import React, { useState, useCallback, useMemo, useEffect } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { useTranslation } from '@fayz-ai/core'
import { ModulePage, PageTransition, type ModuleNavItem } from '@fayz-ai/ui'
import { FinancialContextProvider, type ResolvedFinancialConfig } from './FinancialContext'
import type { FinancialDataProvider } from './data/types'
import type { FinancialUIState } from './store'
import type { PluginRegistryDef, PluginQuickAction } from '@fayz-ai/core'
import { useModuleNavigation, ModuleActionBar, parseViewId, PluginSettingsPanel, EntitlementGate, UpgradePrompt, useModuleNavAccess, PermissionGate, usePermissionOptional } from '@fayz-ai/saas'
import { SummaryView } from './views/SummaryView'
import { QuickTransactionForm } from './views/QuickTransactionForm'
import { usePendingQuickAdd, consumeQuickAdd } from './quick-add'
import type { QuickTransactionType } from './types'
import { Plus } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
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

  // Tag each nav item with its access feature id (item id → feature via the
  // resolved navFeatureMap). `useModuleNavAccess` then hides role-denied links
  // and Crown-badges plan-denied ones; ids absent from the map stay ungated.
  for (const item of items) {
    const feature = config.navFeatureMap[item.id]
    if (feature) item.feature = feature
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

  // Skip the welcome wizard when the provider already has transactions — a user
  // (or a seeded demo/dogfood provider) with existing data should land on the
  // populated Summary, not a "let's get started" flow.
  useEffect(() => {
    if (onboardingComplete) return
    let cancelled = false
    void provider.getMovements({ pageSize: 1 })
      .then((res) => { if (!cancelled && res.total > 0) setOnboardingComplete(true) })
      .catch(() => { /* leave onboarding as-is on error */ })
    return () => { cancelled = true }
  }, [onboardingComplete, provider])

  const t = useTranslation()
  // Role-side create gate (QA: create affordances in custom plugin UIs must honor
  // the role's `create` action, not just the route-level `read` guard). The
  // financial module owns a single `/financial` route gated on read, so every
  // in-page "new" affordance below is otherwise ungated.
  const can = usePermissionOptional()
  const canCreate = can('financial', 'create')
  const intent = parseIntent(view)
  const isSettings = view === 'settings'
  // Access-aware sub-nav: role denial hides the link, plan denial badges it with
  // a Crown (freemium discovery). The click still navigates — the gated CONTENT
  // renders the UpgradePrompt (see renderView's EntitlementGates below).
  const nav = useModuleNavAccess(buildNav(config, view, navigate, t))

  // FAY-1225 "log money in a few taps": a reachable quick-add that opens the
  // Mobills-grade transaction sheet (default = expense). Prominent primary
  // button on desktop + a thumb-reachable FAB on mobile.
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<QuickTransactionType>('expense')
  // FAY-1226 "snap a receipt": when true, the sheet foregrounds the attachment
  // step + auto-opens the camera/gallery picker.
  const [quickAddReceipt, setQuickAddReceipt] = useState(false)
  const openQuickAdd = useCallback((type: QuickTransactionType = 'expense') => {
    setQuickAddType(type)
    setQuickAddReceipt(false)
    setQuickAddOpen(true)
  }, [])

  // FAY-1242: open the sheet on a global quick-add request (the app shell's
  // elevated center "+" button). One-shot — consumed so it never re-fires.
  const pendingQuickAdd = usePendingQuickAdd()
  useEffect(() => {
    if (!pendingQuickAdd) return
    const req = consumeQuickAdd()
    if (!req) return
    // Defense in depth: the app-shell global "+" can request a quick-add even for
    // a read-only member — swallow it when the role lacks `create`.
    if (!canCreate) return
    setQuickAddType(req.type)
    setQuickAddReceipt(req.receipt)
    setQuickAddOpen(true)
  }, [pendingQuickAdd])

  // One-primary-action rule (FAY-1247): each module surfaces exactly ONE primary
  // add affordance and config picks its face — never both. When quickAdd is the
  // primary action (B2C, e.g. norman), suppress the ERP "+ New" menu here so the
  // header shows only the quick-add "Nova transação" button. Payables are still
  // covered: the quick-add sheet's "Pago: Não" creates an unpaid conta a pagar.
  // When quickAdd is off (ERP default, beauty) this returns the payable/receivable/
  // cash actions and no quick-add buttons render — exactly today's behavior.
  const quickActions = useMemo<PluginQuickAction[]>(() => {
    if (config.quickAdd) return []
    // No `create` action → surface no "new" quick actions (payable/receivable/cash
    // are all create affordances under the one-primary-action rule).
    if (!canCreate) return []
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
  }, [config.modules, config.quickAdd, canCreate, navigate, t])

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
              hostPluginId="financial"
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

  // Content side of the sub-module paywall. A sub-module is premium ONLY when
  // the app mapped its nav id to a feature (`navFeatureMap`) — the plugin ships
  // no default, so an unmapped view renders ungated. Symmetric with the nav
  // above: same map drives the Crown on the link and the gate on the content,
  // so an app can never end up with a free-looking link over locked content.
  // The gate must live here because an internal tab is not a shell route — the
  // route guard never sees it (QA finding B35). Full UpgradePrompt (not the
  // inline banner) fills the whole module panel.
  function renderGatedView() {
    const feature = config.navFeatureMap[intent.view]
    if (!feature) return renderView()
    return (
      <EntitlementGate feature={feature} fallback={<UpgradePrompt feature={feature} />}>
        {renderView()}
      </EntitlementGate>
    )
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
          <div className="flex items-center gap-2">
            {config.quickAdd && (
              // One-primary-action rule (FAY-1247): quick-add is the single primary
              // add affordance in B2C mode. The receipt entry point lives inside the
              // sheet's "Fotografar ou anexar recibo" attachment step, so no separate
              // "Enviar recibo" button is needed here.
              // Gated on the role's `create` action so read-only members don't see it.
              <PermissionGate feature="financial" action="create">
                <Button
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={() => openQuickAdd('expense')}
                >
                  <Plus className="h-4 w-4" />
                  {t('financial.quickTx.newTransaction')}
                </Button>
              </PermissionGate>
            )}
            <ModuleActionBar
              quickActions={quickActions}
              settingsPath={registries && registries.length > 0 ? '/settings/financial' : undefined}
              settingsLabel={t('financial.settingsPage.title')}
            />
          </div>
        }
      >
        {renderGatedView()}

        {/* FAY-1242: the mobile quick-add + receipt FAB stack was removed — the
            app shell's elevated center "+" bottom-nav button now owns global
            quick-add (via openQuickAdd), and receipts stay reachable through the
            form's Anexo step. Desktop keeps its header buttons above. */}

        <QuickTransactionForm
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          defaultType={quickAddType}
          focusReceipt={quickAddReceipt}
        />
      </ModulePage>
    </FinancialContextProvider>
  )
}
