import React, { useEffect, useState, useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, RefreshCw, ArrowRightLeft, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { ListView } from '@fayz/ui'
import { useInventoryStore, formatCurrency, useInventoryConfig } from '../InventoryContext'
import { useTranslation } from '@fayz/core'
import { SubpageHeader } from '@fayz/ui'
import type { MovementType, StockMovement } from '../types'

const TYPE_ICONS: Record<MovementType, React.ElementType> = {
  entry: ArrowDownRight,
  exit: ArrowUpRight,
  adjustment: RefreshCw,
  transfer: ArrowRightLeft,
  loss: Trash2,
}

const TYPE_COLORS: Record<MovementType, string> = {
  entry: 'text-success',
  exit: 'text-destructive',
  adjustment: 'text-info',
  transfer: 'text-magic',
  loss: 'text-warning',
}

export function MovementHistoryView({ onViewDetail }: { onViewDetail?: (id: string) => void } = {}) {
  const t = useTranslation()
  const { currency } = useInventoryConfig()
  const movements = useInventoryStore((s) => s.movements)
  const movementsLoading = useInventoryStore((s) => s.movementsLoading)
  const fetchMovements = useInventoryStore((s) => s.fetchMovements)

  const [search, setSearch] = useState('')

  useEffect(() => { fetchMovements({ search: search || undefined }) }, [search])

  const columns: ColumnDef<StockMovement, any>[] = useMemo(() => [
    {
      accessorKey: 'movementDate', header: t('inventory.history.columnDate'),
      cell: ({ getValue }: any) => <span className="text-xs text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'productName', header: t('inventory.history.columnProduct'),
      cell: ({ getValue }: any) => <span className="font-medium">{(getValue() as string) ?? '—'}</span>,
    },
    {
      accessorKey: 'movementType', header: t('inventory.history.columnType'),
      cell: ({ getValue }: any) => {
        const type = getValue() as MovementType
        const Icon = TYPE_ICONS[type] ?? RefreshCw
        const color = TYPE_COLORS[type] ?? 'text-muted-foreground'
        return (
          <span className={`inline-flex items-center gap-1 ${color}`}>
            <Icon className="h-3 w-3" />
            <span className="text-xs capitalize">{type}</span>
          </span>
        )
      },
    },
    {
      id: 'location', header: t('inventory.history.columnLocation'),
      cell: ({ row }: any) => (
        <span className="text-xs text-muted-foreground">
          {row.original.stockLocationName ?? '—'}
          {row.original.movementType === 'transfer' && row.original.destinationLocationName && (
            <span> → {row.original.destinationLocationName}</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'quantity', header: t('inventory.history.columnQty'),
      cell: ({ row }: any) => (
        <span className="text-right block">
          {row.original.movementType === 'entry' ? '+' : '-'}{row.original.quantity}
        </span>
      ),
    },
    {
      accessorKey: 'totalCost', header: t('inventory.history.columnTotal'),
      cell: ({ getValue }: any) => (
        <span className="text-right block text-muted-foreground">{formatCurrency(getValue() as number, currency)}</span>
      ),
    },
  ], [currency, t])

  return (
    <div className="space-y-4">
      <SubpageHeader title={t('inventory.history.title')} subtitle={t('inventory.history.subtitle')} />

      <ListView<StockMovement>
        columns={columns}
        data={movements}
        loading={movementsLoading}
        searchPlaceholder={t('inventory.history.searchPlaceholder')}
        search={search}
        onSearchChange={setSearch}
        searchDebounce={0}
        onRowClick={onViewDetail ? (row) => onViewDetail(row.id) : undefined}
        emptyMessage={t('inventory.history.noMovements')}
      />
    </div>
  )
}
