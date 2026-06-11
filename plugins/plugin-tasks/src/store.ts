import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from './lib/dedup'
import type { TasksDataProvider } from './data/types'
import type {
  Task, TaskLabel, TasksSummary, TaskQuery,
  CreateTaskInput, UpdateTaskInput, TaskStatus,
} from './types'

export interface TasksUIState {
  // Data
  tasks: Task[]
  tasksLoading: boolean
  labels: TaskLabel[]
  summary: TasksSummary | null
  summaryLoading: boolean

  // Drawer UI
  drawerOpen: boolean
  selectedTaskId: string | null
  activeFilter: TaskStatus | 'all'

  // Actions — data
  fetchTasks(query?: TaskQuery): Promise<void>
  fetchLabels(): Promise<void>
  fetchSummary(): Promise<void>
  createTask(input: CreateTaskInput): Promise<Task>
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>
  deleteTask(id: string): Promise<void>
  reorderTask(id: string, newPosition: number, status: TaskStatus): Promise<void>

  // Actions — UI
  openDrawer(): void
  closeDrawer(): void
  toggleDrawer(): void
  selectTask(id: string | null): void
  setFilter(filter: TaskStatus | 'all'): void
}

export function createTasksStore(provider: TasksDataProvider): StoreApi<TasksUIState> {
  return createStore<TasksUIState>((set, get) => ({
    tasks: [],
    tasksLoading: false,
    labels: [],
    summary: null,
    summaryLoading: false,

    drawerOpen: false,
    selectedTaskId: null,
    activeFilter: 'all',

    // ----- Data actions -----

    async fetchTasks(query?: TaskQuery) {
      return dedup('tasks:list', async () => {
        set({ tasksLoading: true })
        try {
          const filter = get().activeFilter
          const q: TaskQuery = {
            parentId: null,
            ...query,
            ...(filter !== 'all' ? { status: filter } : {}),
          }
          const tasks = await provider.getTasks(q)
          set({ tasks, tasksLoading: false })
        } catch {
          set({ tasksLoading: false })
        }
      })
    },

    async fetchLabels() {
      return dedup('tasks:labels', async () => {
        try {
          const labels = await provider.getLabels()
          set({ labels })
        } catch { /* silent */ }
      })
    },

    async fetchSummary() {
      return dedup('tasks:summary', async () => {
        set({ summaryLoading: true })
        try {
          const summary = await provider.getSummary()
          set({ summary, summaryLoading: false })
        } catch {
          set({ summaryLoading: false })
        }
      })
    },

    async createTask(input) {
      const task = await provider.createTask(input)
      // Re-fetch to get correct ordering
      await get().fetchTasks()
      await get().fetchSummary()
      return task
    },

    async updateTask(id, input) {
      const task = await provider.updateTask(id, input)
      // Update in-place for snappy UI, then re-fetch
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }))
      await get().fetchSummary()
      return task
    },

    async deleteTask(id) {
      await provider.deleteTask(id)
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), selectedTaskId: null }))
      await get().fetchSummary()
    },

    async reorderTask(id, newPosition, status) {
      await provider.reorderTask(id, newPosition, status)
      await get().fetchTasks()
    },

    // ----- UI actions -----

    openDrawer() {
      set({ drawerOpen: true })
      // Refresh data when opening
      get().fetchTasks()
      get().fetchLabels()
      get().fetchSummary()
    },

    closeDrawer() {
      set({ drawerOpen: false, selectedTaskId: null })
    },

    toggleDrawer() {
      const { drawerOpen } = get()
      if (drawerOpen) get().closeDrawer()
      else get().openDrawer()
    },

    selectTask(id) {
      set({ selectedTaskId: id })
    },

    setFilter(filter) {
      set({ activeFilter: filter })
      get().fetchTasks()
    },
  }))
}
