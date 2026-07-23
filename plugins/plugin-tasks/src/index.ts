import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { TasksContextProvider, type ResolvedTasksConfig, type TasksPluginLabels } from './TasksContext'
import type { TasksDataProvider } from './data/types'
import type { TaskPriority } from './types'
import { createMockTasksProvider } from './data/mock'
import { createSafeDataProvider, registerTranslations } from '@fayz-ai/core'
import { createSupabaseTasksProvider } from './data/supabase'
import { createTasksStore } from './store'
import { tasksLocales } from './locales'
import { tasksRegistries } from './registries'
import { TasksGeneralSettings } from './components/TasksGeneralSettings'
import { TasksTopbarButton } from './components/TasksTopbarButton'
import { registerNotesTasksAdapter, NOTE_LABEL_PREFIX } from '@fayz-ai/saas'
import { MIGRATION_000_PLG_RENAME, MIGRATION_001_TASKS_BASE } from './migrations'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TasksPluginOptions {
  /** Label overrides */
  labels?: Partial<TasksPluginLabels>
  /** Plugin scope */
  scope?: PluginScope
  /** Vertical ID */
  verticalId?: VerticalId
  /** Data provider override (defaults to safe auto-selection) */
  dataProvider?: TasksDataProvider
  /** Default priority for new tasks (default: 'medium') */
  defaultPriority?: TaskPriority
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: TasksPluginLabels = {
  drawerTitle: 'Tasks',
  settingsTitle: 'Tasks',
  quickAddPlaceholder: 'Add a task...',
}

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: TasksPluginOptions): ResolvedTasksConfig {
  return {
    labels: { ...DEFAULT_LABELS, ...options?.labels },
  }
}


// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTasksPlugin(options?: TasksPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  // Register locales globally so the plugin's translations resolve even when the
  // host shell does not mount @fayz-ai/core's I18nProvider (incremental de-bridge).
  registerTranslations(tasksLocales)
  const provider = options?.dataProvider ?? createSafeDataProvider(
    () => createSupabaseTasksProvider(),
    () => createMockTasksProvider(),
  )
  const store = createTasksStore(provider)

  // Notes ↔ Tasks bridge: note todos are real tasks, linked by a `note:<id>`
  // label. The shell's Notes tab consumes this; the Tarefas tab (and its
  // summary badge) stays the single source of truth.
  registerNotesTasksAdapter({
    async createTodo({ title, noteId, noteTitle }) {
      const task = await provider.createTask({
        title,
        description: noteTitle ? `Nota: ${noteTitle}` : undefined,
        labels: [`${NOTE_LABEL_PREFIX}${noteId}`],
      })
      void store.getState().fetchSummary()
      return { id: task.id, title: task.title, done: task.status === 'done' }
    },
    async listTodos(noteId) {
      const tasks = await provider.getTasks({})
      const label = `${NOTE_LABEL_PREFIX}${noteId}`
      return tasks
        .filter((t) => t.labels.includes(label))
        .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0))
        .map((t) => ({ id: t.id, title: t.title, done: t.status === 'done' }))
    },
    async toggleTodo(id: string, done: boolean) {
      await provider.updateTask(id, { status: done ? 'done' : 'todo' })
      void store.getState().fetchSummary()
    },
    async removeTodo(id: string) {
      await provider.deleteTask(id)
      void store.getState().fetchSummary()
    },
  })

  return {
    id: 'tasks',
    name: config.labels.drawerTitle,
    icon: 'CheckSquare',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],

    navigation: [],

    routes: [],

    widgets: [
      {
        id: 'tasks-topbar-button',
        zone: 'shell.topbar.end',
        component: TasksTopbarButton as unknown as React.ComponentType<unknown>,
        order: 10,
        props: {
          tasksConfig: config,
          tasksProvider: provider,
          tasksStore: store,
        },
      },
    ],

    aiTools: [
      {
        id: 'tasks.summary',
        name: 'getTasksSummary',
        description: 'Returns a summary of pending tasks: total, overdue, due today, by status and priority.',
        icon: 'CheckSquare',
        mode: 'read' as const,
        category: 'Tasks',
        parameters: {
          type: 'object' as const,
          properties: {
            status: {
              type: 'string' as const,
              description: 'Filter by task status',
              enum: ['todo', 'in_progress', 'done', 'cancelled', 'all'],
            },
          },
        },
        suggestions: [
          { label: 'What tasks are overdue?' },
          { label: 'How many tasks are pending?' },
          { label: "What's due today?" },
        ],
      },
    ],

    registries: tasksRegistries,

    settings: [
      {
        id: 'tasks',
        label: config.labels.settingsTitle,
        icon: 'CheckSquare',
        component: (() => {
          const Tab: React.FC = () =>
            React.createElement(TasksContextProvider, { config, provider, store },
              React.createElement(TasksGeneralSettings),
            )
          Tab.displayName = 'TasksSettingsTab'
          return Tab as unknown as React.ComponentType<unknown>
        })(),
        order: 14,
      },
    ],

    migrations: [
      {
        id: 'tasks-000-plg-rename',
        version: '1.0.0',
        sql: MIGRATION_000_PLG_RENAME,
        description: 'Rename legacy tsk_* tables to plg_tasks_* in-place for pools provisioned before the industry-pool rename (guarded no-op on fresh pools)',
      },
      {
        id: 'tasks-001-base-tables',
        version: '1.0.0',
        sql: MIGRATION_001_TASKS_BASE,
        description: 'Create plg_tasks_tasks and plg_tasks_labels',
      },
    ],

    locales: tasksLocales,
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { TasksDataProvider } from './data/types'
export type { ResolvedTasksConfig, TasksPluginLabels } from './TasksContext'
export type {
  Task, TaskLabel, TaskStatus, TaskPriority, TasksSummary,
  CreateTaskInput, UpdateTaskInput, TaskQuery,
} from './types'
