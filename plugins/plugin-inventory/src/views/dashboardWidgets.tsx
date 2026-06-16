import React, { useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { StoreApi } from 'zustand'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import {
  KpiCard, Card, CardHeader, CardTitle, CardContent,
  defineKpiWidget, defineCustomWidget,
} from '@fayz-ai/ui'
import { InventoryContextProvider, useInventoryConfig, useInventoryStore, formatCurrency, type ResolvedInventoryConfig } from '../InventoryContext'
import type { InventoryDataProvider } from '../data/types'
import type { InventoryUIState } from '../store'

function useEnsureSummary() {
  const fetchSummary = useInventoryStore((s) => s.fetchSummary)
  useEffect(() => { void fetchSummary() }, [])
}

function StockValueKpi() {
  const t = useTranslation()
  const { currency } = useInventoryConfig()
  const summary = useInventoryStore((s) => s.summary)
  useEnsureSummary()
  return (
    <KpiCard label={t('inventory.dashboard.stockValue')} icon="BarChart3"
      value={formatCurrency(summary?.totalStockValue ?? 0, currency)} sub={t('inventory.dashboard.totalValue')} />
  )
}

function TotalProductsKpi() {
  const t = useTranslation()
  const summary = useInventoryStore((s) => s.summary)
  useEnsureSummary()
  return <KpiCard label={t('inventory.dashboard.totalProducts')} icon="Package" value={String(summary?.totalProducts ?? 0)} sub={t('inventory.dashboard.activeItems')} />
}

function LowStockKpi() {
  const t = useTranslation()
  const summary = useInventoryStore((s) => s.summary)
  useEnsureSummary()
  return <KpiCard label={t('inventory.dashboard.lowStock')} icon="AlertTriangle" value={String(summary?.lowStockCount ?? 0)} sub={t('inventory.dashboard.belowMinimum')} />
}

function OutOfStockKpi() {
  const t = useTranslation()
  const summary = useInventoryStore((s) => s.summary)
  useEnsureSummary()
  return <KpiCard label={t('inventory.dashboard.outOfStock')} icon="TrendingDown" value={String(summary?.outOfStockCount ?? 0)} sub={t('inventory.dashboard.needRestocking')} />
}

function RecentActivityPanel() {
  const t = useTranslation()
  const summary = useInventoryStore((s) => s.summary)
  useEnsureSummary()
  return (
    <Card>
      <CardHeader><CardTitle>{t('inventory.dashboard.recentActivity')}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
            <span className="text-muted-foreground">{t('inventory.dashboard.entries')}</span>
            <span className="font-medium">{summary?.movementsByType?.entry ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
            <span className="text-muted-foreground">{t('inventory.dashboard.exits')}</span>
            <span className="font-medium">{summary?.movementsByType?.exit ?? 0}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('inventory.dashboard.last7Days')}</p>
      </CardContent>
    </Card>
  )
}

export function createInventoryDashboardWidgets(ctx: {
  config: ResolvedInventoryConfig
  provider: InventoryDataProvider
  store: StoreApi<InventoryUIState>
}): DashboardWidgetDef[] {
  const withCtx = (Inner: React.ComponentType): React.ComponentType<unknown> => {
    const Wrapped = () => (
      <InventoryContextProvider config={ctx.config} provider={ctx.provider} store={ctx.store}>
        <Inner />
      </InventoryContextProvider>
    )
    Wrapped.displayName = `InventoryWidget(${Inner.displayName ?? Inner.name})`
    return Wrapped
  }

  return [
    // Stock value is inventory's headline KPI on the global home; the rest are
    // home-hidden by default (shown on the inventory plugin-home, addable via Customize).
    defineKpiWidget({ id: 'inventory.kpi.stock-value', title: 'inventory.dashboard.stockValue', domain: 'inventory', defaultOrder: 0, component: withCtx(StockValueKpi) }),
    defineKpiWidget({ id: 'inventory.kpi.total-products', title: 'inventory.dashboard.totalProducts', domain: 'inventory', defaultOrder: 1, defaultVisible: false, component: withCtx(TotalProductsKpi) }),
    defineKpiWidget({ id: 'inventory.kpi.low-stock', title: 'inventory.dashboard.lowStock', domain: 'inventory', defaultOrder: 2, defaultVisible: false, component: withCtx(LowStockKpi) }),
    defineKpiWidget({ id: 'inventory.kpi.out-of-stock', title: 'inventory.dashboard.outOfStock', domain: 'inventory', defaultOrder: 3, defaultVisible: false, component: withCtx(OutOfStockKpi) }),
    defineCustomWidget({ id: 'inventory.panel.recent-activity', title: 'inventory.dashboard.recentActivity', domain: 'inventory', span: 2, defaultOrder: 10, surfaces: ['plugin-home'], component: withCtx(RecentActivityPanel) }),
  ]
}
