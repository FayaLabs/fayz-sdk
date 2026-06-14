import React from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle, SheetDescription,
} from '@fayz-ai/ui'
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

export function TasksDrawer() {
  const t = useTranslation()
  const drawerOpen = useTasksStore((s) => s.drawerOpen)
  const closeDrawer = useTasksStore((s) => s.closeDrawer)
  const selectedTaskId = useTasksStore((s) => s.selectedTaskId)
  const tasks = useTasksStore((s) => s.tasks)
  const tasksLoading = useTasksStore((s) => s.tasksLoading)
  const summary = useTasksStore((s) => s.summary)
  const activeFilter = useTasksStore((s) => s.activeFilter)

  // Group tasks by status
  const grouped = React.useMemo(() => {
    const map = new Map<TaskStatus, typeof tasks>()
    for (const s of STATUS_ORDER) map.set(s, [])
    for (const task of tasks) {
      const group = map.get(task.status)
      if (group) group.push(task)
    }
    return map
  }, [tasks])

  // Summary line
  const summaryLine = React.useMemo(() => {
    if (!summary) return ''
    const parts: string[] = []
    if (summary.overdue > 0) parts.push(`${summary.overdue} ${t('tasks.summary.overdue')}`)
    if (summary.dueToday > 0) parts.push(`${summary.dueToday} ${t('tasks.summary.dueToday')}`)
    return parts.join(' · ')
  }, [summary, t])

  return (
    <Sheet open={drawerOpen} onOpenChange={(v) => { if (!v) closeDrawer() }}>
      <SheetContent width="max-w-lg" overlay="dim">
        <SheetHeader>
          <SheetTitle>{t('tasks.drawer.title')}</SheetTitle>
          <SheetDescription>
            {summaryLine || t('tasks.drawer.subtitle')}
          </SheetDescription>
        </SheetHeader>

        {!selectedTaskId && <TasksFilterBar />}
        {!selectedTaskId && <TaskQuickAdd />}

        <SheetBody className="px-0 py-0">
          {selectedTaskId ? (
            <div className="px-5 py-4">
              <TaskDetail taskId={selectedTaskId} />
            </div>
          ) : tasksLoading && tasks.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">{t('tasks.empty')}</p>
              <p className="text-xs mt-1">{t('tasks.empty.description')}</p>
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
            <div className="py-2 space-y-2">
              {STATUS_ORDER.filter((s) => s !== 'cancelled' || (grouped.get(s)?.length ?? 0) > 0).map((status) => (
                <TaskStatusGroup key={status} status={status} tasks={grouped.get(status) ?? []} />
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
