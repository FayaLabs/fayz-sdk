import * as React from 'react'
import { SegmentedControl } from '../primitives/segmented-control'

// ---------------------------------------------------------------------------
// Shared dashboard time range. The canvas provides it; widgets read it via
// useDashboardRange() and refetch/filter their data accordingly.
// ---------------------------------------------------------------------------

export type DashboardRange = string

export const DEFAULT_RANGE_OPTIONS: DashboardRange[] = ['7d', '30d', '90d']

interface DashboardRangeContextValue {
  range: DashboardRange
  setRange: (range: DashboardRange) => void
  options: DashboardRange[]
}

const DashboardRangeContext = React.createContext<DashboardRangeContextValue | null>(null)

/**
 * Read the shared dashboard range. Returns null when no range control is
 * mounted, so widgets can stay range-agnostic.
 */
export function useDashboardRange(): DashboardRangeContextValue | null {
  return React.useContext(DashboardRangeContext)
}

export interface DashboardRangeProviderProps {
  options?: DashboardRange[]
  defaultRange?: DashboardRange
  onChange?: (range: DashboardRange) => void
  children: React.ReactNode
}

export function DashboardRangeProvider({
  options = DEFAULT_RANGE_OPTIONS, defaultRange, onChange, children,
}: DashboardRangeProviderProps) {
  const [range, setRangeState] = React.useState<DashboardRange>(defaultRange ?? options[1] ?? options[0] ?? '30d')
  const setRange = React.useCallback((r: DashboardRange) => {
    setRangeState(r)
    onChange?.(r)
  }, [onChange])
  const value = React.useMemo(() => ({ range, setRange, options }), [range, setRange, options])
  return <DashboardRangeContext.Provider value={value}>{children}</DashboardRangeContext.Provider>
}

/** Segmented 7d / 30d / 90d control bound to the shared dashboard range.
 *  Thin wrapper over the canonical SegmentedControl primitive. */
export function DashboardRangeControl({ className }: { className?: string }) {
  const ctx = useDashboardRange()
  if (!ctx) return null
  return (
    <SegmentedControl
      options={ctx.options}
      value={ctx.range}
      onChange={ctx.setRange}
      className={className}
      aria-label="Time range"
    />
  )
}
