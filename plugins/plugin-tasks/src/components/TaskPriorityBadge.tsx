import React from 'react'
import { AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { TaskPriority } from '../types'

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  low: { color: 'text-muted-foreground', bg: 'bg-muted', icon: ArrowDown },
  medium: { color: 'text-info-soft-foreground', bg: 'bg-info-soft', icon: Minus },
  high: { color: 'text-warning-soft-foreground', bg: 'bg-warning-soft', icon: ArrowUp },
  urgent: { color: 'text-destructive-soft-foreground', bg: 'bg-destructive-soft', icon: AlertTriangle },
}

export function TaskPriorityBadge({ priority, showLabel }: { priority: TaskPriority; showLabel?: boolean }) {
  const cfg = PRIORITY_CONFIG[priority]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon className="h-3 w-3" />
      {showLabel && <span className="capitalize">{priority}</span>}
    </span>
  )
}
