import React from 'react'
import { useStore, type StoreApi } from 'zustand'
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

// ---------------------------------------------------------------------------
// Triple context (config, provider, store)
// ---------------------------------------------------------------------------

const TasksConfigContext = React.createContext<ResolvedTasksConfig | null>(null)
const TasksProviderContext = React.createContext<TasksDataProvider | null>(null)
const TasksStoreContext = React.createContext<StoreApi<TasksUIState> | null>(null)

export function TasksContextProvider({ config, provider, store, children }: {
  config: ResolvedTasksConfig
  provider: TasksDataProvider
  store: StoreApi<TasksUIState>
  children?: React.ReactNode
}) {
  return (
    <TasksConfigContext.Provider value={config}>
      <TasksProviderContext.Provider value={provider}>
        <TasksStoreContext.Provider value={store}>
          {children}
        </TasksStoreContext.Provider>
      </TasksProviderContext.Provider>
    </TasksConfigContext.Provider>
  )
}

export function useTasksConfig(): ResolvedTasksConfig {
  const ctx = React.useContext(TasksConfigContext)
  if (!ctx) throw new Error('useTasksConfig must be used within TasksContextProvider')
  return ctx
}

export function useTasksProvider(): TasksDataProvider {
  const ctx = React.useContext(TasksProviderContext)
  if (!ctx) throw new Error('useTasksProvider must be used within TasksContextProvider')
  return ctx
}

export function useTasksStore<T>(selector: (state: TasksUIState) => T): T {
  const store = React.useContext(TasksStoreContext)
  if (!store) throw new Error('useTasksStore must be used within TasksContextProvider')
  return useStore(store, selector)
}
