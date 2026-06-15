import React, { useEffect, useMemo } from 'react'
import { ChevronRight, Clock, Loader2, ClipboardList } from 'lucide-react'
import { useOrdersConfig, useOrdersStore, formatCurrency } from '../OrdersContext'
import { useTranslation } from '@fayz-ai/core'
import {
  KANBAN_COLUMNS,
  mapToKanbanColumn,
  getNextStatus,
  type KanbanColumn,
  type RestaurantOrder,
} from '../types'

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

const COLUMN_CONFIG: Record<KanbanColumn, { color: string }> = {
  new: { color: 'bg-violet-500' },
  confirmed: { color: 'bg-blue-500' },
  preparing: { color: 'bg-amber-500' },
  ready: { color: 'bg-emerald-500' },
  out: { color: 'bg-cyan-500' },
  completed: { color: 'bg-gray-400' },
  cancelled: { color: 'bg-red-500' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff === 1) return '1min'
  return `${diff}min`
}

// ---------------------------------------------------------------------------
// Order Card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  onAdvance,
  onSelect,
  currency,
}: {
  order: RestaurantOrder
  onAdvance?: () => void
  onSelect: () => void
  currency: { code: string; locale: string; symbol: string }
}) {
  const t = useTranslation()
  const sourceLabel = t(`orders.source.${order.source}`) !== `orders.source.${order.source}`
    ? t(`orders.source.${order.source}`)
    : order.source

  return (
    <div
      className="rounded-lg border bg-card p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onSelect}
    >
      {/* Header: order number + source badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold">{order.referenceNumber}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
          {sourceLabel}
        </span>
      </div>

      {/* Customer + table */}
      {order.partyName && (
        <p className="text-sm font-medium truncate">{order.partyName}</p>
      )}
      {order.tableName && (
        <p className="text-xs text-muted-foreground">{order.tableName}</p>
      )}

      {/* Items */}
      {order.items.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {order.items.map((item) => (
            <p key={item.id} className="text-xs text-muted-foreground truncate">
              {item.quantity}x {item.name}
            </p>
          ))}
        </div>
      )}

      {/* Total + time */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <span className="text-sm font-bold">
          {formatCurrency(order.total, currency)}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(order.createdAt)}
        </span>
      </div>

      {/* Advance button */}
      {onAdvance && (
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onAdvance()
          }}
        >
          {t('orders.kanban.advance')}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton column (loading state)
// ---------------------------------------------------------------------------

function SkeletonColumn() {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="h-9 rounded-lg bg-muted animate-pulse mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted/60 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrderKanbanView
// ---------------------------------------------------------------------------

export function OrderKanbanView() {
  const t = useTranslation()
  const config = useOrdersConfig()

  const activeOrders = useOrdersStore((s) => s.activeOrders)
  const activeOrdersLoading = useOrdersStore((s) => s.activeOrdersLoading)
  const fetchActiveOrders = useOrdersStore((s) => s.fetchActiveOrders)
  const advanceOrderStatus = useOrdersStore((s) => s.advanceOrderStatus)
  const selectOrder = useOrdersStore((s) => s.selectOrder)

  useEffect(() => {
    fetchActiveOrders()
  }, [fetchActiveOrders])

  // Group orders by kanban column
  const grouped = useMemo(() => {
    const map: Record<KanbanColumn, RestaurantOrder[]> = {
      new: [],
      confirmed: [],
      preparing: [],
      ready: [],
      out: [],
      completed: [],
      cancelled: [],
    }
    for (const order of activeOrders) {
      const col = mapToKanbanColumn(order.status)
      map[col].push(order)
    }
    return map
  }, [activeOrders])

  // Loading state
  if (activeOrdersLoading && activeOrders.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <SkeletonColumn key={col} />
        ))}
      </div>
    )
  }

  // Empty state
  if (!activeOrdersLoading && activeOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {t('orders.kanban.noOrders')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {t('orders.kanban.noOrdersDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => {
        const columnOrders = grouped[col]
        const colConfig = COLUMN_CONFIG[col]
        const label = t(`orders.kanban.column.${col}`)
        const hasNext = (order: RestaurantOrder) =>
          getNextStatus(order.kind, order.status) !== null

        return (
          <div key={col} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3">
              <span className={`h-2.5 w-2.5 rounded-full ${colConfig.color}`} />
              <span className="text-sm font-semibold">{label}</span>
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {columnOrders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              {columnOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  currency={config.currency}
                  onSelect={() => selectOrder(order.id)}
                  onAdvance={hasNext(order) ? () => advanceOrderStatus(order.id) : undefined}
                />
              ))}
              {columnOrders.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground rounded-lg border border-dashed">
                  {t('orders.kanban.noOrders')}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
