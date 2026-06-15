import React, { useEffect, useMemo } from 'react'
import { MapPin, Users, Clock, UtensilsCrossed, Loader2 } from 'lucide-react'
import { useTablesConfig, useTablesStore } from '../TablesContext'
import { useTranslation } from '@fayz-ai/core'
import type { RestaurantTable, TableStatus } from '../types'

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const statusConfig: Record<TableStatus, { color: string; bg: string }> = {
  available: { color: 'text-success', bg: 'bg-success/10 border-success/30 hover:bg-success/20' },
  occupied: { color: 'text-primary', bg: 'bg-primary/10 border-primary/30 hover:bg-primary/20' },
  reserved: { color: 'text-accent', bg: 'bg-accent/10 border-accent/30 hover:bg-accent/20' },
  cleaning: { color: 'text-muted-foreground', bg: 'bg-muted border-border hover:bg-muted/80' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(minutes: number | undefined, minLabel: string): string {
  if (minutes == null) return ''
  if (minutes < 60) return `${minutes}${minLabel}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}${minLabel}` : `${h}h`
}

function formatCurrency(value: number | undefined): string {
  if (value == null) return ''
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'BRL' }).format(value)
}

// ---------------------------------------------------------------------------
// Table card
// ---------------------------------------------------------------------------

function TableCard({ table, isSelected, onClick, t }: {
  table: RestaurantTable
  isSelected: boolean
  onClick: () => void
  t: (key: string) => string
}) {
  const config = statusConfig[table.status]
  const isLarge = table.seats >= 6
  const minLabel = t('tables.floorPlan.min')

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all cursor-pointer
        ${config.bg}
        ${isLarge ? 'col-span-2' : ''}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      style={{ minHeight: '120px' }}
    >
      <span className={`text-2xl font-bold ${config.color}`}>{table.number}</span>
      <span className="text-xs text-muted-foreground mt-1">
        {table.seats} {t('tables.floorPlan.seats')}
      </span>

      {table.status === 'occupied' && (
        <>
          <span className="text-xs font-medium mt-1">
            {table.currentGuests} {t('tables.detail.guests').toLowerCase()}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatElapsed(table.currentElapsedMinutes, minLabel)}
          </span>
        </>
      )}

      <span
        className={`
          absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium border
          ${table.status === 'occupied'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary text-secondary-foreground border-border'}
        `}
      >
        {t(`tables.floorPlan.${table.status}`)}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Detail sidebar
// ---------------------------------------------------------------------------

function DetailPanel({ table, t }: { table: RestaurantTable; t: (key: string) => string }) {
  const updateTableStatus = useTablesStore(s => s.updateTableStatus)
  const seatGuests = useTablesStore(s => s.seatGuests)
  const closeSession = useTablesStore(s => s.closeSession)
  const minLabel = t('tables.floorPlan.min')

  return (
    <div className="rounded-lg border bg-card p-5 sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">
          {table.name || `#${table.number}`}
        </h3>
        <span
          className={`
            text-xs px-2 py-1 rounded-full font-medium border
            ${table.status === 'occupied'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary text-secondary-foreground border-border'}
          `}
        >
          {t(`tables.floorPlan.${table.status}`)}
        </span>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('tables.floorPlan.seats')}</dt>
          <dd className="font-medium">{table.seats}</dd>
        </div>
        {table.zoneName && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('tables.floorPlan.zone')}</dt>
            <dd className="font-medium">{table.zoneName}</dd>
          </div>
        )}
        {table.status === 'occupied' && (
          <>
            {table.currentGuests != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('tables.detail.guests')}</dt>
                <dd className="font-medium">{table.currentGuests}</dd>
              </div>
            )}
            {table.currentWaiterName && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('tables.detail.waiter')}</dt>
                <dd className="font-medium">{table.currentWaiterName}</dd>
              </div>
            )}
            {table.currentOrderId && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('tables.floorPlan.order')}</dt>
                <dd className="font-medium">{table.currentOrderId}</dd>
              </div>
            )}
            {table.currentTotal != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('tables.detail.total')}</dt>
                <dd className="font-bold text-base">{formatCurrency(table.currentTotal)}</dd>
              </div>
            )}
            {table.currentElapsedMinutes != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('tables.detail.elapsed')}</dt>
                <dd className="font-medium">{formatElapsed(table.currentElapsedMinutes, minLabel)}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {table.status === 'available' && (
          <button
            className="col-span-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={() => seatGuests({ tableId: table.id, guests: 2 })}
          >
            {t('tables.detail.seatGuests')}
          </button>
        )}
        {table.status === 'occupied' && (
          <>
            <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              {t('tables.detail.viewOrder')}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => {
                if (table.currentSessionId) closeSession(table.currentSessionId)
              }}
            >
              {t('tables.detail.closeTable')}
            </button>
          </>
        )}
        {table.status === 'cleaning' && (
          <button
            className="col-span-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={() => updateTableStatus({ tableId: table.id, status: 'available' })}
          >
            {t('tables.detail.markClean')}
          </button>
        )}
        {table.status === 'reserved' && (
          <>
            <button
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => updateTableStatus({ tableId: table.id, status: 'available' })}
            >
              {t('tables.detail.cancel')}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => seatGuests({ tableId: table.id, guests: 2 })}
            >
              {t('tables.floorPlan.checkIn')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function FloorPlanSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-20 rounded bg-muted animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, z) => (
            <div key={z} className="rounded-lg border bg-card p-5">
              <div className="h-4 w-24 rounded bg-muted animate-pulse mb-4" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[120px] rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="h-[300px] rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function FloorPlanView() {
  const t = useTranslation()
  const config = useTablesConfig()

  const tables = useTablesStore(s => s.tables)
  const zones = useTablesStore(s => s.zones)
  const tablesLoading = useTablesStore(s => s.tablesLoading)
  const fetchTables = useTablesStore(s => s.fetchTables)
  const fetchZones = useTablesStore(s => s.fetchZones)
  const selectedTableId = useTablesStore(s => s.selectedTableId)
  const selectTable = useTablesStore(s => s.selectTable)

  // Fetch on mount
  useEffect(() => {
    fetchTables()
    fetchZones()
  }, [fetchTables, fetchZones])

  // Group tables by zone
  const tablesByZone = useMemo(() => {
    const map = new Map<string, { zoneName: string; color?: string; tables: RestaurantTable[] }>()

    // Seed zone order from store zones
    for (const zone of zones) {
      map.set(zone.id, { zoneName: zone.name, color: zone.color, tables: [] })
    }

    for (const table of tables) {
      const zoneId = table.zone
      if (!map.has(zoneId)) {
        map.set(zoneId, { zoneName: table.zoneName || zoneId, tables: [] })
      }
      map.get(zoneId)!.tables.push(table)
    }

    // Filter out empty zones
    return Array.from(map.entries())
      .filter(([, v]) => v.tables.length > 0)
      .map(([id, v]) => ({ id, ...v }))
  }, [tables, zones])

  // Summary counts
  const occupiedCount = tables.filter(t => t.status === 'occupied').length
  const availableCount = tables.filter(t => t.status === 'available').length

  // Selected table
  const selectedTable = selectedTableId
    ? tables.find(t => t.id === selectedTableId) ?? null
    : null

  // Loading state
  if (tablesLoading && tables.length === 0) {
    return <FloorPlanSkeleton />
  }

  // Empty state
  if (!tablesLoading && tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">{t('tables.floorPlan.noTables')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('tables.floorPlan.noTablesDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header: summary + status legend */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {t('tables.floorPlan.occupiedOf')
              .replace('{occupied}', String(occupiedCount))
              .replace('{available}', String(availableCount))
              .replace('{total}', String(tables.length))}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {(Object.keys(statusConfig) as TableStatus[]).map(status => (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <div className={`h-3 w-3 rounded-full ${statusConfig[status].bg} border`} />
              <span className="text-muted-foreground">{t(`tables.floorPlan.${status}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floor plan grid + detail panel */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Zone sections */}
        <div className="space-y-6">
          {tablesByZone.map(zone => (
            <div key={zone.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                {zone.color && (
                  <div
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: zone.color }}
                  />
                )}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {zone.zoneName}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {zone.tables.map(table => (
                  <TableCard
                    key={table.id}
                    table={table}
                    isSelected={table.id === selectedTableId}
                    onClick={() => selectTable(table.id === selectedTableId ? null : table.id)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel / sidebar */}
        <div>
          {selectedTable ? (
            <DetailPanel table={selectedTable} t={t} />
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">{t('tables.floorPlan.selectTable')}</p>
              <p className="text-sm mt-1">{t('tables.floorPlan.selectTableDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
