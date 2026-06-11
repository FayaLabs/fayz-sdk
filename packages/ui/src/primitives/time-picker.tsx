import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

// ---------------------------------------------------------------------------
// TimePicker — dropdown time slot selector, Google Calendar style
// ---------------------------------------------------------------------------

function formatTime12(h: number, m: number) {
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${period}`
}

function formatTime24(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

interface TimePickerProps {
  /** Value as HH:MM (24h) */
  value: string
  onChange: (value: string) => void
  /** Interval in minutes between slots (default: 15) */
  interval?: number
  /** Min time as HH:MM (default: '00:00') */
  min?: string
  /** Max time as HH:MM (default: '23:45') */
  max?: string
  /** Use 12h format for display (default: false) */
  use12h?: boolean
  /** Read-only mode */
  readOnly?: boolean
  className?: string
  /** Open the dropdown immediately on mount */
  defaultOpen?: boolean
  /** Called when the dropdown opens or closes */
  onOpenChange?: (open: boolean) => void
}

export function TimePicker({ value, onChange, interval = 15, min = '00:00', max = '23:45', use12h = false, readOnly, className, defaultOpen, onOpenChange }: TimePickerProps) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  // Position the portal dropdown
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 120) })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
      onOpenChange?.(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Scroll to selected time when opening
  useEffect(() => {
    if (!open || !listRef.current || !value) return
    const el = listRef.current.querySelector('[data-selected="true"]')
    if (el) el.scrollIntoView({ block: 'center' })
  }, [open, value])

  const slots = useMemo(() => {
    const [minH, minM] = min.split(':').map(Number)
    const [maxH, maxM] = max.split(':').map(Number)
    const minTotal = minH * 60 + minM
    const maxTotal = maxH * 60 + maxM
    const result: { value: string; label: string }[] = []

    for (let t = minTotal; t <= maxTotal; t += interval) {
      const h = Math.floor(t / 60)
      const m = t % 60
      result.push({
        value: formatTime24(h, m),
        label: use12h ? formatTime12(h, m) : formatTime24(h, m),
      })
    }
    return result
  }, [interval, min, max, use12h])

  const displayValue = useMemo(() => {
    if (!value) return ''
    const [h, m] = value.split(':').map(Number)
    return use12h ? formatTime12(h, m) : formatTime24(h, m)
  }, [value, use12h])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (readOnly) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = slots.findIndex((s) => s.value === value)
      const next = e.key === 'ArrowDown'
        ? Math.min(idx + 1, slots.length - 1)
        : Math.max(idx - 1, 0)
      if (slots[next]) onChange(slots[next].value)
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      {/* Trigger */}
      <button ref={triggerRef} type="button"
        onClick={() => !readOnly && setOpen((p) => !p)}
        onKeyDown={handleKeyDown}
        disabled={readOnly}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm w-full text-left transition-colors ${
          readOnly ? 'bg-muted/40 text-muted-foreground cursor-default' : 'bg-background hover:bg-muted/30'
        }`}>
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span>{displayValue || '--:--'}</span>
      </button>

      {/* Dropdown — portal to escape overflow containers */}
      {open && !readOnly && createPortal(
        <div ref={listRef} data-modal-passthrough
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, pointerEvents: 'auto' }}
          className="min-w-[120px] max-h-48 overflow-y-auto rounded-xl border bg-popover shadow-xl py-1">
          {slots.map((slot) => {
            const selected = slot.value === value
            return (
              <button key={slot.value} type="button" data-selected={selected}
                onClick={() => { onChange(slot.value); setOpen(false) }}
                className={`block w-full px-3 py-1.5 text-sm text-left transition-colors ${
                  selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
                }`}>
                {slot.label}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
