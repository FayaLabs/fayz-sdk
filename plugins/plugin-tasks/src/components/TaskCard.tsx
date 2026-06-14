import React from 'react'
import { Calendar, ListChecks } from 'lucide-react'
import { Checkbox } from '@fayz-ai/ui'
import { useTasksStore } from '../TasksContext'
import { TaskPriorityBadge } from './TaskPriorityBadge'
import { TaskLabelBadges } from './TaskLabelBadge'
import type { Task } from '../types'

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return dueDate < new Date().toISOString().slice(0, 10)
}

function isToday(dueDate: string | null): boolean {
  if (!dueDate) return false
  return dueDate === new Date().toISOString().slice(0, 10)
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TaskCard({ task, subtaskCount }: { task: Task; subtaskCount?: { done: number; total: number } }) {
  const selectTask = useTasksStore((s) => s.selectTask)
  const updateTask = useTasksStore((s) => s.updateTask)

  const isDone = task.status === 'done'
  const overdue = !isDone && isOverdue(task.dueDate)
  const dueToday = !isDone && isToday(task.dueDate)

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateTask(task.id, { status: isDone ? 'todo' : 'done' })
  }

  return (
    <div
      onClick={() => selectTask(task.id)}
      className="group flex items-start gap-2.5 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:bg-muted bg-card shadow-button active:shadow-button-inset hover:border-border cursor-pointer"
    >
      <div className="pt-0.5" onClick={handleCheck}>
        <Checkbox checked={isDone} onChange={() => {}} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm leading-snug ${isDone ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <TaskPriorityBadge priority={task.priority} />

          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 text-[11px] ${
              overdue ? 'text-destructive font-medium' : dueToday ? 'text-warning font-medium' : 'text-muted-foreground'
            }`}>
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {subtaskCount && subtaskCount.total > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ListChecks className="h-3 w-3" />
              {subtaskCount.done}/{subtaskCount.total}
            </span>
          )}

          <TaskLabelBadges labelIds={task.labels} max={2} />
        </div>
      </div>

      {task.assignedToName && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary" title={task.assignedToName}>
          {task.assignedToName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  )
}
