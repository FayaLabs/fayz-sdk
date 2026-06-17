import type { TasksDataProvider } from './types'
import type { Task, TaskLabel, TasksSummary, TaskStatus } from '../types'
import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import { getTasksTenantId } from '../lib/tenant'

function getTenantId(): string | undefined {
  // Local override wins; else use the app's active tenant so writes pass RLS.
  return getTasksTenantId() ?? getActiveTenantId()
}

function getClient() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return supabase
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value
  }
  return result
}

function toTask(row: Record<string, unknown>): Task {
  const t = snakeToCamel(row) as unknown as Task
  // Ensure labels is always an array
  if (!Array.isArray(t.labels)) t.labels = []
  return t
}

export function createSupabaseTasksProvider(): TasksDataProvider {
  return {
    async getTasks(query) {
      const tenantId = getTenantId()
      if (!tenantId) return []
      let q = getClient()
        .from('tsk_tasks')
        .select('*')
        .eq('tenant_id', tenantId)

      if (query.parentId === null) {
        q = q.is('parent_id', null)
      } else if (query.parentId) {
        q = q.eq('parent_id', query.parentId)
      }

      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        q = q.in('status', statuses)
      }
      if (query.priority) {
        const priorities = Array.isArray(query.priority) ? query.priority : [query.priority]
        q = q.in('priority', priorities)
      }
      if (query.assignedToId) {
        q = q.eq('assigned_to_id', query.assignedToId)
      }
      if (query.search) {
        q = q.ilike('title', `%${query.search}%`)
      }
      if (query.overdue) {
        q = q.lt('due_date', new Date().toISOString().slice(0, 10))
          .not('status', 'in', '("done","cancelled")')
      }

      q = q.order('position', { ascending: true }).order('created_at', { ascending: false })

      const { data } = await q
      return (data ?? []).map(toTask)
    },

    async getTaskById(id) {
      const { data } = await getClient()
        .from('tsk_tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      return data ? toTask(data) : null
    },

    async getSubtasks(parentId) {
      const { data } = await getClient()
        .from('tsk_tasks')
        .select('*')
        .eq('parent_id', parentId)
        .order('position', { ascending: true })
      return (data ?? []).map(toTask)
    },

    async createTask(input) {
      const tenantId = getTenantId()
      if (!tenantId) throw new Error('No active tenant')

      // Get max position for the status group
      const { data: maxData } = await getClient()
        .from('tsk_tasks')
        .select('position')
        .eq('tenant_id', tenantId)
        .eq('status', input.status ?? 'todo')
        .is('parent_id', input.parentId ?? null)
        .order('position', { ascending: false })
        .limit(1)
      const maxPos = maxData?.[0]?.position ?? -1

      const { data, error } = await getClient()
        .from('tsk_tasks')
        .insert({
          tenant_id: tenantId,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? 'todo',
          priority: input.priority ?? 'medium',
          due_date: input.dueDate ?? null,
          assigned_to_id: input.assignedToId ?? null,
          parent_id: input.parentId ?? null,
          labels: input.labels ?? [],
          position: maxPos + 1,
        })
        .select('*')
        .single()
      if (error) throw error
      return toTask(data)
    },

    async updateTask(id, input) {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.title !== undefined) payload.title = input.title
      if (input.description !== undefined) payload.description = input.description
      if (input.status !== undefined) payload.status = input.status
      if (input.priority !== undefined) payload.priority = input.priority
      if (input.dueDate !== undefined) payload.due_date = input.dueDate
      if (input.assignedToId !== undefined) payload.assigned_to_id = input.assignedToId
      if (input.labels !== undefined) payload.labels = input.labels
      if (input.position !== undefined) payload.position = input.position

      const { data, error } = await getClient()
        .from('tsk_tasks')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return toTask(data)
    },

    async deleteTask(id) {
      await getClient().from('tsk_tasks').delete().eq('id', id)
    },

    async reorderTask(id, newPosition, status) {
      await getClient()
        .from('tsk_tasks')
        .update({ position: newPosition, status, updated_at: new Date().toISOString() })
        .eq('id', id)
    },

    async getLabels() {
      const tenantId = getTenantId()
      if (!tenantId) return []
      const { data } = await getClient()
        .from('tsk_labels')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as TaskLabel)
    },

    async getSummary() {
      const tenantId = getTenantId()
      if (!tenantId) return { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0, dueToday: 0, highPriority: 0 }

      const { data } = await getClient()
        .from('tsk_tasks')
        .select('status, priority, due_date')
        .eq('tenant_id', tenantId)
        .is('parent_id', null)

      const tasks = data ?? []
      const today = new Date().toISOString().slice(0, 10)
      return {
        total: tasks.length,
        todo: tasks.filter((t: any) => t.status === 'todo').length,
        inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
        done: tasks.filter((t: any) => t.status === 'done').length,
        overdue: tasks.filter((t: any) => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled').length,
        dueToday: tasks.filter((t: any) => t.due_date === today && t.status !== 'done' && t.status !== 'cancelled').length,
        highPriority: tasks.filter((t: any) => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done' && t.status !== 'cancelled').length,
      }
    },
  }
}
