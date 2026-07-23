import React from 'react'
import { useTasksStore } from '../TasksContext'
import { useTranslation } from '@fayz-ai/core'
import { TasksFilterBar } from './TasksFilterBar'
import { TaskQuickAdd } from './TaskQuickAdd'
import { TaskCard } from './TaskCard'
import { TaskStatusGroup } from './TaskStatusGroup'
import { TaskDetail } from './TaskDetail'
import { ClipboardList } from 'lucide-react'
import type { TaskStatus } from '../types'

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']

/** The task list with no box around it — shared by the sheet and the shell's
 *  right-rail tab. */
export function TasksPanel() {
  const t = useTranslation()
  const selectedTaskId = useTasksStore((s) => s.selectedTaskId)
  const tasks = useTasksStore((s) => s.tasks)
  const tasksLoading = useTasksStore((s) => s.tasksLoading)
  const activeFilter = useTasksStore((s) => s.activeFilter)
  const fetchTasks = useTasksStore((s) => s.fetchTasks)
  const fetchLabels = useTasksStore((s) => s.fetchLabels)
  const fetchSummary = useTasksStore((s) => s.fetchSummary)

  // The rail tab mounts this panel directly — openDrawer() (the sheet path,
  // where fetching used to live) never runs there, so load on mount. Fetches
  // are deduped in the store, so the drawer path doesn't double-load.
  React.useEffect(() => {
    void fetchTasks()
    void fetchLabels()
    void fetchSummary()
  }, [fetchTasks, fetchLabels, fetchSummary])

  const grouped = React.useMemo(() => {
    const map = new Map<TaskStatus, typeof tasks>()
    for (const s of STATUS_ORDER) map.set(s, [])
    for (const task of tasks) {
      const group = map.get(task.status)
      if (group) group.push(task)
    }
    return map
  }, [tasks])

  return (
    <>
      {!selectedTaskId && <TasksFilterBar />}
      {!selectedTaskId && <TaskQuickAdd />}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedTaskId ? (
          <TaskDetail taskId={selectedTaskId} />
        ) : tasksLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">{t('tasks.empty')}</p>
            <p className="mt-1 text-xs">{t('tasks.empty.description')}</p>
          </div>
        ) : activeFilter !== 'all' ? (
          <div className="py-1">
            {tasks.map((task) => (
              <div key={task.id} className="px-2">
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {STATUS_ORDER.filter((s) => s !== 'cancelled' || (grouped.get(s)?.length ?? 0) > 0).map((status) => (
              <TaskStatusGroup key={status} status={status} tasks={grouped.get(status) ?? []} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/** One-line summary of what needs attention ("3 atrasadas · 2 para hoje"). */
export function useTasksSummaryLine(): string {
  const t = useTranslation()
  const summary = useTasksStore((s) => s.summary)
  return React.useMemo(() => {
    if (!summary) return ''
    const parts: string[] = []
    if (summary.overdue > 0) parts.push(`${summary.overdue} ${t('tasks.summary.overdue')}`)
    if (summary.dueToday > 0) parts.push(`${summary.dueToday} ${t('tasks.summary.dueToday')}`)
    return parts.join(' · ')
  }, [summary, t])
}
