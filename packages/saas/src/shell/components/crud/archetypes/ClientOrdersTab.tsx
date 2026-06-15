import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  CalendarDays, FileText, CircleDashed, CircleEllipsis, CircleCheckBig,
  CircleAlert, Ban, ShoppingBag, Clock, UserX, ExternalLink,
} from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { ListView } from '@fayz-ai/ui'
import { useTranslation } from '../../../hooks/useTranslation'
import type { EntityDef } from '../../../types/crud'
import type { ClientDocument, ClientDocumentStage, ClientOrdersProvider, ClientOrdersNavigator } from '../../../types/client-orders'

// ---------------------------------------------------------------------------
// Stage badge config
// ---------------------------------------------------------------------------

interface StageDef {
  icon: React.ElementType
  color: string
  labelKey: string
}

const STAGE_CONFIG: Record<string, StageDef> = {
  draft:     { icon: CircleDashed, color: 'bg-muted text-muted-foreground', labelKey: 'crud.orders.stage.draft' },
  quoted:    { icon: FileText, color: 'bg-info-soft text-info-soft-foreground', labelKey: 'crud.orders.stage.quoted' },
  booked:    { icon: CalendarDays, color: 'bg-magic-soft text-magic-soft-foreground', labelKey: 'crud.orders.stage.booked' },
  invoiced:  { icon: FileText, color: 'bg-warning-soft text-warning-soft-foreground', labelKey: 'crud.orders.stage.invoiced' },
  paid:      { icon: CircleCheckBig, color: 'bg-success-soft text-success-soft-foreground', labelKey: 'crud.orders.stage.paid' },
  partial:   { icon: CircleEllipsis, color: 'bg-warning-soft text-warning-soft-foreground', labelKey: 'crud.orders.stage.partial' },
  overdue:   { icon: CircleAlert, color: 'bg-destructive-soft text-destructive-soft-foreground', labelKey: 'crud.orders.stage.overdue' },
  cancelled: { icon: Ban, color: 'bg-muted text-muted-foreground', labelKey: 'crud.orders.stage.cancelled' },
  no_show:   { icon: UserX, color: 'bg-destructive-soft text-destructive-soft-foreground', labelKey: 'crud.orders.stage.no_show' },
  completed: { icon: CircleCheckBig, color: 'bg-success-soft text-success-soft-foreground', labelKey: 'crud.orders.stage.completed' },
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function useColumns(
  currency: { code: string; locale: string },
  t: (key: string) => string,
  onBookingClick?: (orderId: string) => void,
  onInvoiceClick?: (orderId: string) => void,
): ColumnDef<ClientDocument, any>[] {
  return useMemo(() => [
    {
      accessorKey: 'date',
      header: t('crud.orders.columnDate'),
      size: 140,
      cell: ({ row }) => {
        const doc = row.original
        const dateStr = new Date(doc.date).toLocaleDateString(currency.locale, { day: '2-digit', month: 'short', year: '2-digit' })
        // If this order has a booking time, make it a clickable link
        if (doc.startsAt && onBookingClick) {
          const time = new Date(doc.startsAt).toLocaleTimeString(currency.locale, { hour: '2-digit', minute: '2-digit' })
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBookingClick(doc.id) }}
              className="inline-flex items-center gap-1 text-xs text-magic hover:underline whitespace-nowrap"
            >
              <CalendarDays className="h-3 w-3" />
              {dateStr} {time}
            </button>
          )
        }
        return <span className="text-xs text-muted-foreground whitespace-nowrap">{dateStr}</span>
      },
    },
    {
      id: 'stage',
      header: t('crud.orders.columnStage'),
      size: 120,
      cell: ({ row }) => {
        const cfg = STAGE_CONFIG[row.original.stage] ?? STAGE_CONFIG.draft
        const Icon = cfg.icon
        const translated = t(cfg.labelKey)
        const label = translated.startsWith('crud.orders.stage.') ? row.original.stage : translated
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
            <Icon className="h-2.5 w-2.5" />
            {label}
          </span>
        )
      },
    },
    {
      accessorKey: 'referenceNumber',
      header: '#',
      size: 100,
      cell: ({ getValue }) => {
        const num = getValue() as string | undefined
        return num
          ? <span className="text-xs font-mono text-muted-foreground">#{num}</span>
          : <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: 'description',
      header: t('crud.orders.columnDescription'),
      cell: ({ getValue }) => (
        <span className="text-sm truncate max-w-[200px] block">
          {(getValue() as string) || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'total',
      header: t('crud.orders.columnAmount'),
      size: 120,
      cell: ({ row }) => {
        const doc = row.original
        const val = doc.total
        if (!val) return <span className="text-muted-foreground">—</span>
        const formatted = new Intl.NumberFormat(currency.locale, { style: 'currency', currency: currency.code }).format(val)
        const isFinancial = ['invoiced', 'paid', 'partial', 'overdue'].includes(doc.stage)
        // If invoiced/paid and has a reference, link to invoice detail
        if (isFinancial && onInvoiceClick) {
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onInvoiceClick(doc.id) }}
              className={`inline-flex items-center gap-1 font-medium text-sm text-primary hover:underline ${doc.stage === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}
            >
              {formatted}
              <ExternalLink className="h-2.5 w-2.5" />
            </button>
          )
        }
        return (
          <span className={`font-medium text-sm ${doc.stage === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>
            {formatted}
          </span>
        )
      },
    },
  ], [currency, t, onBookingClick, onInvoiceClick])
}

// ---------------------------------------------------------------------------
// Tab Component
// ---------------------------------------------------------------------------

export function ClientOrdersTab({
  item,
  entityDef,
  provider,
  navigator,
  onBookingClick,
  onInvoiceClick,
  currency = { code: 'BRL', locale: 'pt-BR' },
}: {
  item: any
  entityDef: EntityDef
  provider: ClientOrdersProvider
  navigator?: ClientOrdersNavigator
  onBookingClick?: (orderId: string) => void
  onInvoiceClick?: (orderId: string) => void
  currency?: { code: string; locale: string }
}) {
  const { t } = useTranslation()
  const [docs, setDocs] = useState<ClientDocument[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string | undefined>()

  const clientId = item.id as string

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await provider.getDocuments({
        clientId,
        stages: stageFilter ? [stageFilter] : undefined,
      })
      setDocs(result.data)
      setTotal(result.total)
    } catch {
      setDocs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [clientId, stageFilter, provider])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const columns = useColumns(currency, t, onBookingClick, onInvoiceClick)

  const tags = useMemo(() => [
    { value: 'booked', label: t('crud.orders.stage.booked') },
    { value: 'invoiced', label: t('crud.orders.stage.invoiced') },
    { value: 'paid', label: t('crud.orders.stage.paid') },
    { value: 'quoted', label: t('crud.orders.stage.quoted') },
  ], [t])

  return (
    <ListView<ClientDocument>
      columns={columns}
      data={docs}
      loading={loading}
      searchPlaceholder={t('crud.orders.searchPlaceholder')}
      tags={tags}
      allTagLabel={t('crud.orders.all')}
      activeTag={stageFilter}
      onTagChange={(v: any) => setStageFilter(v)}
      onRowClick={navigator ? (row: any) => navigator.onNavigate(row) : undefined}
      emptyIcon={ShoppingBag}
      emptyMessage={t('crud.orders.noDocuments')}
    />
  )
}
