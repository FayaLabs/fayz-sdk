import React, { useState, useMemo } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { useTranslation } from '@fayz-ai/core'
import { ModulePage, PageTransition, type ModuleNavItem } from '@fayz-ai/ui'
import { CrmContextProvider, type ResolvedCrmConfig } from './CrmContext'
import type { CrmDataProvider } from './data/types'
import type { CrmUIState } from './store'
import type { PluginRegistryDef, PluginQuickAction } from '@fayz-ai/core'
import { useModuleNavigation, ModuleActionBar, createViewRouter } from '@fayz-ai/saas'
import { CrmGeneralSettings } from './components/CrmGeneralSettings'
import { CrmOnboarding } from './components/CrmOnboarding'
import { DashboardView } from './views/DashboardView'
import { PipelineView } from './views/PipelineView'
import { LeadListView } from './views/LeadListView'
import { LeadFormView } from './views/LeadFormView'
import { QuoteListView } from './views/QuoteListView'
import { QuoteFormView } from './views/QuoteFormView'
import { QuoteDetailView } from './views/QuoteDetailView'
import { LeadDetailView } from './views/LeadDetailView'
import { ActivityListView } from './views/ActivityListView'

function buildNav(config: ResolvedCrmConfig, view: string, navigate: (v: string) => void): ModuleNavItem[] {
  const items: ModuleNavItem[] = [
    { id: 'dashboard', label: config.labels.dashboard, icon: 'BarChart3', active: view === 'dashboard', onClick: () => navigate('dashboard') },
  ]

  if (config.modules.pipeline) {
    items.push({ id: 'pipeline', label: config.labels.pipeline, icon: 'Filter', active: view === 'pipeline', onClick: () => navigate('pipeline') })
  }

  items.push({
    id: 'leads', label: config.labels.leads, icon: 'UserPlus',
    children: [
      { id: 'leads-new', label: config.labels.leadsNew, active: view === 'leads-new', onClick: () => navigate('leads-new') },
      { id: 'leads-list', label: config.labels.leadsList, active: view === 'leads-list' || view.startsWith('leads-detail:'), onClick: () => navigate('leads-list') },
    ],
  })

  if (config.modules.quotes) {
    items.push({
      id: 'quotes', label: config.labels.quotes, icon: 'FileText',
      children: [
        { id: 'quotes-new', label: config.labels.quotesNew, active: view === 'quotes-new', onClick: () => navigate('quotes-new') },
        { id: 'quotes-list', label: config.labels.quotesList, active: view === 'quotes-list' || view.startsWith('quotes-detail:') || view.startsWith('quotes-edit:'), onClick: () => navigate('quotes-list') },
      ],
    })
  }

  if (config.modules.activities) {
    items.push({ id: 'activities', label: config.labels.activities, icon: 'MessageCircle', active: view === 'activities', onClick: () => navigate('activities') })
  }

  return items
}

export function CrmPage({ config, provider, store, registries }: {
  config: ResolvedCrmConfig
  provider: CrmDataProvider
  store: StoreApi<CrmUIState>
  registries?: PluginRegistryDef[]
}) {
  const { view, direction, navigate } = useModuleNavigation('/sales', {
    dashboard: 0, pipeline: 0,
    'leads-list': 0, 'leads-new': 1, 'leads-detail': 1,
    'quotes-list': 0, 'quotes-new': 1, 'quotes-detail': 1, 'quotes-edit': 2,
    activities: 0,
    settings: 1,
  }, 'dashboard')

  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    try { return localStorage.getItem('saas-core:crm-onboarded') === 'true' } catch { return false }
  })
  const isSettings = view === 'settings'
  const isSummary = view === 'dashboard'
  const nav = buildNav(config, view, navigate)

  const t = useTranslation()

  const quickActions = useMemo<PluginQuickAction[]>(() => [
    { id: 'new-lead', label: t('crm.quickActions.newLead'), icon: 'UserPlus', description: t('crm.quickActions.newLeadDesc'), action: () => navigate('leads-new') },
    { id: 'new-deal', label: t('crm.quickActions.newDeal'), icon: 'Target', description: t('crm.quickActions.newDealDesc'), action: () => navigate('pipeline') },
    ...(config.modules.quotes ? [{ id: 'new-quote', label: t('crm.quickActions.newQuote'), icon: 'FileText', description: t('crm.quickActions.newQuoteDesc'), action: () => navigate('quotes-new') }] : []),
    ...(config.modules.activities ? [{ id: 'log-activity', label: t('crm.quickActions.logActivity'), icon: 'MessageCircle', description: t('crm.quickActions.logActivityDesc'), action: () => navigate('activities') }] : []),
  ], [config.modules])

  if (!onboardingComplete) {
    return (
      <CrmContextProvider config={config} provider={provider} store={store}>
        <CrmOnboarding onComplete={() => { setOnboardingComplete(true); try { localStorage.setItem('saas-core:crm-onboarded', 'true') } catch {} }} />
      </CrmContextProvider>
    )
  }

  if (isSettings && registries && registries.length > 0) {
    return (
      <CrmContextProvider config={config} provider={provider} store={store}>
        <PageTransition transitionKey="settings" direction={direction}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{t('crm.settingsPage.title')}</h1>
              <p style={{ color: 'var(--muted-foreground, #6b7280)', margin: '4px 0 0', fontSize: '14px' }}>
                {t('crm.settingsPage.subtitle')}
              </p>
            </div>
            <CrmGeneralSettings />
          </div>
        </PageTransition>
      </CrmContextProvider>
    )
  }

  const renderView = createViewRouter([
    { id: 'pipeline', render: () => <PipelineView onViewLead={(id) => navigate(`leads-detail:${id}`)} onViewQuote={(id) => navigate(`quotes-detail:${id}`)} onAddLead={() => navigate('leads-new')} /> },
    { id: 'leads-list', render: () => <LeadListView onNew={() => navigate('leads-new')} onEdit={(id) => navigate(`leads-detail:${id}`)} /> },
    { id: 'leads-new', render: () => <LeadFormView onSaved={(id) => id ? navigate(`leads-detail:${id}`) : navigate('leads-list')} /> },
    { id: 'quotes-new', render: () => {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
      const lid = hashParams.get('leadId') ?? undefined
      return <QuoteFormView leadId={lid} onSaved={(id) => id ? navigate(`quotes-detail:${id}`) : navigate('quotes-list')} />
    } },
    { id: 'quotes-list', render: () => <QuoteListView onNew={() => navigate('quotes-new')} onEdit={(id) => navigate(`quotes-detail:${id}`)} onEditQuote={(id) => navigate(`quotes-edit:${id}`)} /> },
    { id: 'activities', render: () => <ActivityListView onOpenLead={(id) => navigate(`leads-detail:${id}`)} onOpenQuote={(id) => navigate(`quotes-detail:${id}`)} /> },
    { id: 'leads-detail', render: ({ id }) => <LeadDetailView leadId={id!} onBack={() => navigate('leads-list')} onCreateQuote={(lid) => navigate('quotes-new', `/sales/quotes/new?leadId=${lid}`)} onViewQuote={(qid) => navigate(`quotes-detail:${qid}`)} /> },
    { id: 'quotes-detail', render: ({ id }) => <QuoteDetailView quoteId={id!} onBack={() => navigate('quotes-list')} onEdit={() => navigate(`quotes-edit:${id}`)} onInvoiceCreated={(invoiceId) => { window.location.hash = `/financial/receivables/detail/${invoiceId}` }} /> },
    { id: 'quotes-edit', render: ({ id }) => <QuoteFormView quoteId={id!} onSaved={() => navigate(`quotes-detail:${id}`)} /> },
    { id: 'dashboard', render: () => <DashboardView /> },
  ], 'dashboard')

  return (
    <CrmContextProvider config={config} provider={provider} store={store}>
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
            settingsPath={registries && registries.length > 0 ? '/settings/crm' : undefined}
            settingsLabel="CRM Settings"
          />
        }
      >
        {renderView(view)}
      </ModulePage>
    </CrmContextProvider>
  )
}
