import * as React from 'react'
import { cn } from '../utils/cn'

export interface SegmentedOption<T extends string = string> {
  value: T
  label: React.ReactNode
}

export interface SegmentedControlProps<T extends string = string> {
  /** Options as plain values (label = value) or `{ value, label }` objects. */
  options: ReadonlyArray<T | SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  /** Matches the equivalent Button heights: sm = 26px, md = 30px. */
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

const SIZE: Record<'sm' | 'md', { container: string; segment: string }> = {
  sm: { container: 'h-[26px]', segment: 'px-2.5 text-xs' },
  md: { container: 'h-[30px]', segment: 'px-3 text-sm' },
}

/**
 * Canonical segmented (pill) control — same chrome as Button (rounded-button
 * radius, hairline border + shadow-button bevel on a card surface). Use this for
 * any 7d/30d/90d-style toggle so every surface stays visually consistent instead
 * of hand-rolling a styled toggle group.
 */
export function SegmentedControl<T extends string = string>({
  options, value, onChange, size = 'sm', className, ...rest
}: SegmentedControlProps<T>) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)) as SegmentedOption<T>[]
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn(
        'inline-flex items-center rounded-button border border-border bg-card p-0.5 shadow-button',
        SIZE[size].container,
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex h-full items-center rounded-button font-semibold transition-colors',
              SIZE[size].segment,
              active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/60',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
