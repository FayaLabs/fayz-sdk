import React from 'react'
import { useTasksStore } from '../TasksContext'
import { useTranslation } from '@fayz-ai/core'
import type { TaskStatus } from '../types'

const FILTERS: Array<{ key: TaskStatus | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'tasks.filter.all' },
  { key: 'todo', labelKey: 'tasks.filter.todo' },
  { key: 'in_progress', labelKey: 'tasks.filter.inProgress' },
  { key: 'done', labelKey: 'tasks.filter.done' },
]

export function TasksFilterBar() {
  const t = useTranslation()
  const activeFilter = useTasksStore((s) => s.activeFilter)
  const setFilter = useTasksStore((s) => s.setFilter)
  const summary = useTasksStore((s) => s.summary)

  const getCount = (key: TaskStatus | 'all'): number | undefined => {
    if (!summary) return undefined
    switch (key) {
      case 'all': return summary.total
      case 'todo': return summary.todo
      case 'in_progress': return summary.inProgress
      case 'done': return summary.done
      default: return undefined
    }
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
      {FILTERS.map(({ key, labelKey }) => {
        const active = activeFilter === key
        const count = getCount(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {t(labelKey)}
            {count != null && (
              <span className={`text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
