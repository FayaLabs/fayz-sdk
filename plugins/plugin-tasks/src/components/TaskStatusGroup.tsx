import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from '@fayz-ai/core'
import { TaskCard } from './TaskCard'
import type { Task, TaskStatus } from '../types'

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground',
  in_progress: 'bg-info',
  done: 'bg-success',
  cancelled: 'bg-muted-foreground/60',
}

export function TaskStatusGroup({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const t = useTranslation()
  const [collapsed, setCollapsed] = useState(status === 'cancelled')

  if (tasks.length === 0) return null

  const Chevron = collapsed ? ChevronRight : ChevronDown

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
        <span>{t(`tasks.status.${status}`)}</span>
        <span className="text-[10px] font-normal">({tasks.length})</span>
        <Chevron className="ml-auto h-3.5 w-3.5" />
      </button>

      {!collapsed && (
        <div>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
