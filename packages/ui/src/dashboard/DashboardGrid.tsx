import * as React from 'react'
import { cn } from '../utils/cn'

export interface DashboardGridItem {
  id: string
  /** Column span on the 4-col grid (defaults to 1). */
  span?: number
  node: React.ReactNode
}

/** Literal span → Tailwind classes (kept literal so the JIT compiler picks them up). */
const SPAN_CLASS: Record<number, string> = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
}

export interface DashboardGridProps {
  items: DashboardGridItem[]
  className?: string
}

/** Responsive 4-col dashboard grid — the layout every dashboard shares. */
export function DashboardGrid({ items, className }: DashboardGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((item) => (
        <div key={item.id} className={SPAN_CLASS[Math.min(Math.max(item.span ?? 1, 1), 4)] ?? ''}>
          {item.node}
        </div>
      ))}
    </div>
  )
}
