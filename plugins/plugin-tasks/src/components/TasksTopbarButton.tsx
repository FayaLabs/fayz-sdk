import React, { useEffect } from 'react'
import { CheckSquare } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import { cn } from '@fayz-ai/ui'
import { useRightRailPanel, useRightRailStore } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'
import { TasksContextProvider, type ResolvedTasksConfig } from '../TasksContext'
import { TasksDrawer } from './TasksDrawer'
import { TasksPanel } from './TasksPanel'
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
  const t = useTranslation()
  // The shell's rail when there is one, this plugin's sheet when there is not.
  const railMounted = useRightRailStore((s) => s.mounted)
  // Open tasks (todo + in progress) — the rail tab's red badge.
  const summary = useStore(tasksStore, (s) => s.summary)
  const openCount = summary ? summary.todo + summary.inProgress : 0

  // Carries its own providers (registered far from here) and must stay
  // referentially stable or the list remounts every render.
  const Panel = React.useMemo(() => {
    const RailPanel = () => (
      <TasksContextProvider config={tasksConfig} provider={tasksProvider} store={tasksStore}>
        <TasksPanel />
      </TasksContextProvider>
    )
    RailPanel.displayName = 'TasksRailPanel'
    return RailPanel
  }, [tasksConfig, tasksProvider, tasksStore])

  useRightRailPanel(
    React.useMemo(
      () =>
        railMounted
          ? {
              id: 'tasks',
              label: t('tasks.drawer.title') || 'Tasks',
              icon: CheckSquare,
              order: 20,
              badge: { count: openCount, tone: 'destructive' as const },
              Component: Panel,
            }
          : null,
      [railMounted, t, Panel, openCount],
    ),
  )

  return (
    <TasksContextProvider config={tasksConfig} provider={tasksProvider} store={tasksStore}>
      <TasksTopbarButtonInner store={tasksStore} railMounted={railMounted} />
      {!railMounted && <TasksDrawer />}
    </TasksContextProvider>
  )
}

function TasksTopbarButtonInner({
  store,
  railMounted,
}: {
  store: StoreApi<TasksUIState>
  railMounted: boolean
}) {
  const toggleDrawer = useStore(store, (s) => s.toggleDrawer)
  const fetchSummary = useStore(store, (s) => s.fetchSummary)
  const summary = useStore(store, (s) => s.summary)
  const togglePanel = useRightRailStore((s) => s.togglePanel)

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const pendingCount = summary ? summary.todo + summary.inProgress : 0

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative text-sidebar-foreground/70 hover:bg-sidebar/30 hover:text-sidebar-foreground')}
      onClick={() => (railMounted ? togglePanel('tasks') : toggleDrawer())}
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
