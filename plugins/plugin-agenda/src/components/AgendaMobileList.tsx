import React, { useMemo } from 'react'
import { formatCurrency, useTranslation, getCurrentLocale } from '@fayz-ai/core'
import type { CalendarBooking } from '../types'

// ---------------------------------------------------------------------------
// Mobile agenda list — a thumb-friendly, date-grouped list of upcoming items.
// Rendered on <md viewports instead of the FullCalendar grid. Each row shows a
// category/status dot, the title, the time, and (for finance-style events) the
// amount. Fed straight from the store bookings so it works for any seeded app.
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface AgendaMobileListProps {
  bookings: CalendarBooking[]
  statusColors: Record<string, string>
  currencyCode: string
  onSelect: (booking: CalendarBooking) => void
}

export function AgendaMobileList({ bookings, statusColors, currencyCode, onSelect }: AgendaMobileListProps) {
  const t = useTranslation()
  const locale = getCurrentLocale() === 'pt-BR' ? 'pt-BR' : 'en'

  const groups = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime()
    const sorted = bookings
      .filter((b) => !!b.startsAt)
      .slice()
      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0))
    const map = new Map<string, CalendarBooking[]>()
    for (const b of sorted) {
      const day = startOfDay(new Date(b.startsAt))
      if (day.getTime() < todayStart) continue // upcoming only
      const key = day.toISOString().slice(0, 10)
      const list = map.get(key) ?? []
      list.push(b)
      map.set(key, list)
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, date: new Date(key + 'T00:00:00'), items }))
  }, [bookings])

  function dayLabel(date: Date): string {
    const today = startOfDay(new Date())
    const diff = Math.round((startOfDay(date).getTime() - today.getTime()) / 86400000)
    if (diff === 0) return t('agenda.list.today')
    if (diff === 1) return t('agenda.list.tomorrow')
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  }

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center text-muted-foreground">
        <p className="text-sm">{t('agenda.list.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {dayLabel(g.date)}
          </h3>
          <div className="space-y-1.5">
            {g.items.map((b) => {
              const color = statusColors[b.status] ?? '#6b7280'
              const hasAmount = typeof b.orderTotal === 'number' && b.orderTotal > 0
              return (
                <button
                  key={b.id}
                  onClick={() => onSelect(b)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-colors active:bg-muted/50"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{b.clientName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{timeLabel(b.startsAt)}</p>
                  </div>
                  {hasAmount && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(b.orderTotal, currencyCode)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
