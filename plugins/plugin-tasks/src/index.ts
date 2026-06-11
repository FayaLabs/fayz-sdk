import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz/core'
import { TasksContextProvider, type ResolvedTasksConfig, type TasksPluginLabels } from './TasksContext'
import type { TasksDataProvider } from './data/types'
import type { TaskPriority } from './types'
import { createMockTasksProvider } from './data/mock'
import { getSupabaseClientOptional, registerTranslations } from '@fayz/core'
import { createSupabaseTasksProvider } from './data/supabase'
import { createTasksStore } from './store'
import { tasksLocales } from './locales'
import { tasksRegistries } from './registries'
import { TasksGeneralSettings } from './components/TasksGeneralSettings'
import { TasksTopbarButton } from './components/TasksTopbarButton'

// ---------------------------------------------------------------------------
// Safe provider (auto-selects mock or Supabase)
// ---------------------------------------------------------------------------

function createSafeTasksProvider(): TasksDataProvider {
  let resolved: TasksDataProvider | null = null
  function get(): TasksDataProvider {
    if (!resolved) resolved = getSupabaseClientOptional() ? createSupabaseTasksProvider() : createMockTasksProvider()
    return resolved
  }
  return new Proxy({} as TasksDataProvider, {
    get: (_, prop) => (...args: any[]) => (get() as any)[prop](...args),
  })
}

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
// Migration SQL
// ---------------------------------------------------------------------------

const MIGRATION_001 = `-- Tasks Plugin: Base Tables
CREATE TABLE IF NOT EXISTS public.tsk_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tsk_labels ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tsk_labels_tenant ON public.tsk_labels(tenant_id);

CREATE TABLE IF NOT EXISTS public.tsk_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date date,
  assigned_to_id uuid,
  assigned_to_name text,
  parent_id uuid REFERENCES public.tsk_tasks(id) ON DELETE CASCADE,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_by_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tsk_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_tenant ON public.tsk_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_status ON public.tsk_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_parent ON public.tsk_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_assigned ON public.tsk_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tsk_tasks_due ON public.tsk_tasks(tenant_id, due_date) WHERE due_date IS NOT NULL;

-- RLS policies for tsk_tasks
CREATE POLICY tsk_tasks_select ON public.tsk_tasks FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_tasks_insert ON public.tsk_tasks FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_tasks_update ON public.tsk_tasks FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_tasks_delete ON public.tsk_tasks FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tsk_tasks TO authenticated;

-- RLS policies for tsk_labels
CREATE POLICY tsk_labels_select ON public.tsk_labels FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_labels_insert ON public.tsk_labels FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_labels_update ON public.tsk_labels FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY tsk_labels_delete ON public.tsk_labels FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tsk_labels TO authenticated;`

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTasksPlugin(options?: TasksPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  // Register locales globally so the plugin's translations resolve even when the
  // host shell does not mount @fayz/core's I18nProvider (incremental de-bridge).
  registerTranslations(tasksLocales)
  const provider = options?.dataProvider ?? createSafeTasksProvider()
  const store = createTasksStore(provider)

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
        id: 'tasks-001-base-tables',
        version: '1.0.0',
        sql: MIGRATION_001,
        description: 'Create tsk_tasks and tsk_labels tables',
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
