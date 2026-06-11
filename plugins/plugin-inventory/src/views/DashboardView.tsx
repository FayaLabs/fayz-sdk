import React, { useEffect } from 'react'
import { Package, AlertTriangle, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react'
import { useInventoryConfig, useInventoryStore, formatCurrency } from '../InventoryContext'
import { useTranslation } from '@fayz/core'

function StatCard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: string; subtitle: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  )
}

export function DashboardView() {
  const t = useTranslation()
  const { currency } = useInventoryConfig()
  const summary = useInventoryStore((s) => s.summary)
  const fetchSummary = useInventoryStore((s) => s.fetchSummary)

  useEffect(() => { fetchSummary() }, [])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('inventory.dashboard.totalProducts')}
          value={String(summary?.totalProducts ?? 0)}
          subtitle={t('inventory.dashboard.activeItems')}
          icon={Package}
          color="bg-info/15 text-info dark:bg-info/20"
        />
        <StatCard
          label={t('inventory.dashboard.lowStock')}
          value={String(summary?.lowStockCount ?? 0)}
          subtitle={t('inventory.dashboard.belowMinimum')}
          icon={AlertTriangle}
          color="bg-warning/15 text-warning dark:bg-warning/20"
        />
        <StatCard
          label={t('inventory.dashboard.outOfStock')}
          value={String(summary?.outOfStockCount ?? 0)}
          subtitle={t('inventory.dashboard.needRestocking')}
          icon={TrendingDown}
          color="bg-destructive-soft text-destructive-soft-foreground"
        />
        <StatCard
          label={t('inventory.dashboard.stockValue')}
          value={formatCurrency(summary?.totalStockValue ?? 0, currency)}
          subtitle={t('inventory.dashboard.totalValue')}
          icon={BarChart3}
          color="bg-success-soft text-success-soft-foreground"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">{t('inventory.dashboard.recentActivity')}</h3>
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
          <p className="text-xs text-muted-foreground mt-2">{t('inventory.dashboard.last7Days')}</p>
        </div>

        <div className="rounded-lg border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">{t('inventory.dashboard.quickActions')}</h3>
          <p className="text-xs text-muted-foreground">{t('inventory.dashboard.quickActionsDesc')}</p>
        </div>
      </div>
    </div>
  )
}
