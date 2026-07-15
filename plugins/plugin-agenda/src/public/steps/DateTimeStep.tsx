import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { TimeSlot } from '../../types'
import type { DayCell } from '../format'
import type { BookingFormatters, PublicBookingLabels, WorkingHours } from '../types'

interface DateTimeStepProps {
  labels: PublicBookingLabels
  fmt: BookingFormatters
  week: DayCell[]
  weekOffset: number
  maxWeekOffset: number
  onWeekOffset: (updater: (w: number) => number) => void
  businessHours: WorkingHours
  date: string | null
  onSelectDate: (iso: string) => void
  slots: TimeSlot[]
  slotsLoading: boolean
  slotStart: string | null
  onSelectSlot: (startIso: string) => void
  onContinue: () => void
}

/** Week strip + available-slot grid. */
export function DateTimeStep({
  labels, fmt, week, weekOffset, maxWeekOffset, onWeekOffset, businessHours,
  date, onSelectDate, slots, slotsLoading, slotStart, onSelectSlot, onContinue,
}: DateTimeStepProps) {
  const openDays = new Set(businessHours.daysOfWeek)
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-xl font-bold text-foreground">{labels.dateStep}</h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {labels.timezoneNote}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm font-semibold capitalize text-foreground">{fmt.month.format(week[0].date)}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={weekOffset === 0}
            onClick={() => onWeekOffset((w) => Math.max(0, w - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={labels.prevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={weekOffset >= maxWeekOffset}
            onClick={() => onWeekOffset((w) => Math.min(maxWeekOffset, w + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={labels.nextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const selected = date === d.iso
          const closed = !openDays.has(d.date.getDay())
          return (
            <button
              key={d.iso}
              type="button"
              disabled={closed}
              onClick={() => onSelectDate(d.iso)}
              className={[
                'flex flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                closed
                  ? 'cursor-not-allowed border-transparent text-muted-foreground/40'
                  : selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:border-primary/60 hover:bg-accent/40',
              ].join(' ')}
            >
              <span className="text-[11px] font-medium capitalize opacity-80">
                {fmt.weekday.format(d.date).replace('.', '')}
              </span>
              <span className="text-sm font-bold tabular-nums">{fmt.dayNum.format(d.date)}</span>
            </button>
          )
        })}
      </div>

      {date ? (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-foreground">{labels.slotsHeading}</p>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {labels.noSlots}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => {
                const selected = slotStart === s.start
                return (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => onSelectSlot(s.start)}
                    className={[
                      'rounded-lg border py-2.5 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-foreground hover:border-primary/60 hover:bg-accent/40',
                    ].join(' ')}
                  >
                    {fmt.time.format(new Date(s.start))}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!slotStart}
        onClick={onContinue}
        className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {labels.continueCta}
      </button>
    </div>
  )
}
