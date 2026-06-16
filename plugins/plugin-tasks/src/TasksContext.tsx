import { createPluginContext } from '@fayz-ai/saas'
import type { TasksDataProvider } from './data/types'
import type { TasksUIState } from './store'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface TasksPluginLabels {
  drawerTitle: string
  settingsTitle: string
  quickAddPlaceholder: string
}

export interface ResolvedTasksConfig {
  labels: TasksPluginLabels
}

const ctx = createPluginContext<ResolvedTasksConfig, TasksDataProvider, TasksUIState>('TasksContextProvider')

export const TasksContextProvider = ctx.ContextProvider
export const useTasksConfig = ctx.useConfig
export const useTasksProvider = ctx.useProvider
export const useTasksStore = ctx.useStore
