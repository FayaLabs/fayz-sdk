import React from 'react'
import { useAgendaConfig } from '../AgendaContext'

export function StatusBadge({ status }: { status: string }) {
  const config = useAgendaConfig()
  const statusConfig = config.statuses.find((s) => s.value === status)
  const color = statusConfig?.color ?? '#6b7280'
  const label = statusConfig?.label ?? status

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
