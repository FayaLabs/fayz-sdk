import React, { useEffect } from 'react'
import { CheckSquare } from 'lucide-react'
import { Button } from '@fayz/ui'
import { cn } from '@fayz/ui'
import { TasksContextProvider, type ResolvedTasksConfig } from '../TasksContext'
import { TasksDrawer } from './TasksDrawer'
import type { TasksDataProvider } from '../data/types'
import type { TasksUIState } from '../store'
import { useStore, type StoreApi } from 'zustand'

interface TasksTopbarWidgetProps {
  config: {
    tasksConfig: ResolvedTasksConfig
    tasksProvider: TasksDataProvider
    tasksStore: StoreApi<TasksUIState>
  }
}

export function TasksTopbarButton({ config }: TasksTopbarWidgetProps) {
  const { tasksConfig, tasksProvider, tasksStore } = config

  return (
    <TasksContextProvider config={tasksConfig} provider={tasksProvider} store={tasksStore}>
      <TasksTopbarButtonInner store={tasksStore} />
      <TasksDrawer />
    </TasksContextProvider>
  )
}

function TasksTopbarButtonInner({ store }: { store: StoreApi<TasksUIState> }) {
  const toggleDrawer = useStore(store, (s) => s.toggleDrawer)
  const fetchSummary = useStore(store, (s) => s.fetchSummary)
  const summary = useStore(store, (s) => s.summary)

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const pendingCount = summary ? summary.todo + summary.inProgress : 0

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative text-sidebar-foreground/70 hover:bg-sidebar/30 hover:text-sidebar-foreground')}
      onClick={toggleDrawer}
      aria-label="Tasks"
    >
      <CheckSquare className="h-5 w-5" />
      {pendingCount > 0 && (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground',
            pendingCount > 9
              ? 'h-5 min-w-5 px-1 text-[10px]'
              : 'h-4 w-4 text-[10px]'
          )}
        >
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </Button>
  )
}
