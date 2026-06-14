import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import { getCurrentLocale } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// DatePicker — custom dropdown calendar, Google Calendar style
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<string, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  'pt-BR': ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
}

function toDateLocale(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  return 'en-US'
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(d: Date) { return isSameDay(d, new Date()) }

function formatDate(date: Date, locale: string) {
  return date.toLocaleDateString(toDateLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface DatePickerProps {
  /** Value as YYYY-MM-DD string */
  value: string
  onChange: (value: string) => void
  className?: string
  /** Open the dropdown immediately on mount */
  defaultOpen?: boolean
  /** Called when the dropdown opens or closes */
  onOpenChange?: (open: boolean) => void
}

export function DatePicker({ value, onChange, className, defaultOpen, onOpenChange }: DatePickerProps) {
  const t = useTranslation()
  const locale = getCurrentLocale()
  const [open, setOpen] = useState(defaultOpen ?? false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedDate = value ? parseDate(value) : new Date()
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const dayLabels = DAY_LABELS[locale] ?? DAY_LABELS.en
  const dateLocale = toDateLocale(locale)

  // Position the portal dropdown relative to the trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 260
    let left = rect.left
    if (left + dropW > window.innerWidth - 12) left = window.innerWidth - dropW - 12
    if (left < 8) left = 8
    setPos({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
      onOpenChange?.(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onOpenChange])

  // Sync view month when value changes externally
  useEffect(() => {
    if (value) {
      const d = parseDate(value)
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [value])

  const monthLabel = viewMonth.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })

  const weeks = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const cells: { date: Date; inMonth: boolean }[] = []
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevMonthDays - i), inMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: new Date(year, month + 1, cells.length - startOffset - daysInMonth + 1), inMonth: false })
    }

    const rows: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [viewMonth])

  function handleSelect(date: Date) {
    onChange(toDateStr(date))
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      {/* Trigger */}
      <button ref={triggerRef} type="button" onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm hover:bg-muted/30  transition-colors w-full text-left">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span>{value ? formatDate(selectedDate, locale) : t('common.selectDate')}</span>
      </button>

      {/* Dropdown — portal to escape overflow containers */}
      {open && createPortal(
        <div ref={dropdownRef} data-modal-passthrough
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, pointerEvents: 'auto' }}
          className="rounded-xl border bg-popover shadow-xl p-3 w-[260px]">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium capitalize">{monthLabel}</span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {dayLabels.map((l, i) => (
              <div key={i} className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground">{l}</div>
            ))}
          </div>

          {/* Dates */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map(({ date, inMonth }, di) => {
                const sel = value && isSameDay(date, selectedDate)
                const today = isToday(date)
                return (
                  <button key={di} type="button"
                    onClick={() => handleSelect(date)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs mx-auto transition-colors ${
                      sel
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : today
                          ? 'bg-primary/10 text-primary font-semibold'
                          : inMonth
                            ? 'hover:bg-muted text-foreground'
                            : 'text-muted-foreground/40 hover:bg-muted/50'
                    }`}>
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          ))}

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t">
            <button type="button" onClick={() => { handleSelect(new Date()) }}
              className="text-xs text-primary font-medium hover:underline">{t('agenda.calendar.today')}</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
