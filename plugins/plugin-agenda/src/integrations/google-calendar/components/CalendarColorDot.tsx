// A small round swatch tinted with a Google calendar's backgroundColor.
//
// Google's calendarList entries carry a `backgroundColor` hex; we render it as a
// dot next to the calendar summary in the de-para list and as the leading dot of
// the origin badge in the import wizard. Falls back to the muted border when a
// calendar has no color (rare, e.g. some shared calendars).
import React from 'react'

export function CalendarColorDot({
  color,
  className = '',
}: {
  color?: string | null
  className?: string
}) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10 ${className}`}
      style={{ backgroundColor: color || 'hsl(var(--muted-foreground))' }}
      aria-hidden
    />
  )
}
