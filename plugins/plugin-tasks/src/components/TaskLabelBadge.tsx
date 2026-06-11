import React from 'react'
import { useTasksStore } from '../TasksContext'

export function TaskLabelBadge({ labelId }: { labelId: string }) {
  const labels = useTasksStore((s) => s.labels)
  const label = labels.find((l) => l.id === labelId)
  if (!label) return null

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none"
      style={{
        backgroundColor: label.color + '20',
        color: label.color,
      }}
    >
      {label.name}
    </span>
  )
}

export function TaskLabelBadges({ labelIds, max = 2 }: { labelIds: string[]; max?: number }) {
  if (labelIds.length === 0) return null
  const visible = labelIds.slice(0, max)
  const overflow = labelIds.length - max

  return (
    <span className="inline-flex items-center gap-1">
      {visible.map((id) => (
        <TaskLabelBadge key={id} labelId={id} />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground">+{overflow}</span>
      )}
    </span>
  )
}
