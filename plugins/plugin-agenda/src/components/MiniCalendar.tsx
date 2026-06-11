import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCurrentLocale } from '@fayz/core'

interface MiniCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onMonthChange?: (date: Date) => void
}

const DAY_LABELS: Record<string, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  'pt-BR': ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(d: Date) {
  return isSameDay(d, new Date())
}

function toDateLocale(locale: string): string {
  if (locale === 'pt-BR') return 'pt-BR'
  return 'en-US'
}

export function MiniCalendar({ selectedDate, onDateSelect, onMonthChange }: MiniCalendarProps) {
  const locale = getCurrentLocale()
  const [viewMonth, setViewMonth] = React.useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))

  const monthLabel = viewMonth.toLocaleDateString(toDateLocale(locale), { month: 'long', year: 'numeric' })
  const dayLabels = DAY_LABELS[locale] ?? DAY_LABELS.en

  const weeks = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)

    const rows: (Date | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [viewMonth])

  function prevMonth() {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
    setViewMonth(d)
    onMonthChange?.(d)
  }

  function nextMonth() {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
    setViewMonth(d)
    onMonthChange?.(d)
  }

  function handleClick(date: Date) {
    onDateSelect(date)
  }

  return (
    <div className="select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={prevMonth} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={nextMonth} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-0.5">
        {dayLabels.map((label, i) => (
          <div key={i} className="flex h-6 w-6 items-center justify-center text-[10px] font-medium text-muted-foreground mx-auto">
            {label}
          </div>
        ))}
      </div>

      {/* Dates */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((date, di) => {
            if (!date) return <div key={di} className="h-6 w-6 mx-auto" />
            const selected = isSameDay(date, selectedDate)
            const today = isToday(date)
            return (
              <button
                key={di}
                onClick={() => handleClick(date)}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] mx-auto transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : today
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-muted text-foreground'
                }`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
