// ---------------------------------------------------------------------------
// Date/price formatting + calendar helpers shared by the booking widget and
// its (host-overridable) subcomponents.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import type { BookingFormatters } from './types'

export const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday-first, like the reference

export function useFormatters(locale: string, currency: string): BookingFormatters {
  return useMemo(
    () => ({
      price: new Intl.NumberFormat(locale, { style: 'currency', currency }),
      time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
      dayNum: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }),
      longDay: new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'long' }),
      dateShort: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      month: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    }),
    [locale, currency],
  )
}

/** Local 'YYYY-MM-DD' for a Date. */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Read a preselected service from the URL (?service=…), router-agnostic. */
export function readServiceParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('service')
}

/**
 * Comparable form of a service name: lowercase, accent-free, non-alphanumerics
 * collapsed to single dashes.
 *
 * Exists because the marketing site and the catalog spell the same service
 * differently — the site writes "Peeling Químico" and "Drenagem Linfática", the
 * catalog stores "Peeling Quimico" and "Drenagem Linfatica". Matching on the
 * raw name would miss most of them, and making the site link raw UUIDs instead
 * would scatter database ids through page markup and break on every reseed.
 */
export function serviceSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Resolve `?service=` against the catalog. Accepts the service id or its
 * slugified name, so a site can link `/agendar?service=limpeza-de-pele`
 * without knowing any ids. Unknown value ⇒ null, and the widget opens on the
 * overview as if no service had been asked for.
 */
export function resolvePreselectedService<T extends { id: string; name: string }>(
  param: string | null,
  services: T[],
): string | null {
  if (!param) return null
  if (services.some((s) => s.id === param)) return param
  const wanted = serviceSlug(param)
  return services.find((s) => serviceSlug(s.name) === wanted)?.id ?? null
}

export interface DayCell {
  iso: string
  date: Date
  isToday: boolean
}

/** 7 consecutive days starting `weekOffset*7` days from today. */
export function buildWeek(weekOffset: number): DayCell[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const cells: DayCell[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + weekOffset * 7 + i)
    cells.push({ iso: toIso(d), date: d, isToday: weekOffset === 0 && i === 0 })
  }
  return cells
}

/** "13/07/2026 – 21:30 até 22:00 (30min)" */
export function formatSlotRange(startIso: string, durationMin: number, fmt: BookingFormatters): string {
  const start = new Date(startIso)
  const end = new Date(start.getTime() + durationMin * 60_000)
  return `${fmt.dateShort.format(start)} – ${fmt.time.format(start)} até ${fmt.time.format(end)} (${durationMin}min)`
}
