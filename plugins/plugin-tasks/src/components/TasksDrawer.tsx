import React from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle, SheetDescription,
} from '@fayz-ai/ui'
import { useTasksStore } from '../TasksContext'
import { useTranslation } from '@fayz-ai/core'
import { TasksPanel, useTasksSummaryLine } from './TasksPanel'

/** Tasks as a sheet — the fallback where the shell has no right rail. */
export function TasksDrawer() {
  const t = useTranslation()
  const drawerOpen = useTasksStore((s) => s.drawerOpen)
  const closeDrawer = useTasksStore((s) => s.closeDrawer)
  const summaryLine = useTasksSummaryLine()

  return (
    <Sheet open={drawerOpen} onOpenChange={(v) => { if (!v) closeDrawer() }}>
      <SheetContent width="max-w-lg" overlay="dim">
        <SheetHeader>
          <SheetTitle>{t('tasks.drawer.title')}</SheetTitle>
          <SheetDescription>
            {summaryLine || t('tasks.drawer.subtitle')}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col px-0 py-0">
          <TasksPanel />
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
