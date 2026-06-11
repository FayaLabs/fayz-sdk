import type { TasksDataProvider } from './types'
import type {
  Task, TaskLabel, CreateTaskInput, UpdateTaskInput,
  TaskQuery, TasksSummary, TaskStatus,
} from '../types'

function uid(): string { return crypto.randomUUID?.() ?? String(Date.now()) }
function now(): string { return new Date().toISOString() }
function today(): string { return new Date().toISOString().slice(0, 10) }

const SEED_LABELS: TaskLabel[] = [
  { id: 'lbl-bug', name: 'Bug', color: '#ef4444', isActive: true, tenantId: 'mock', createdAt: now() },
  { id: 'lbl-feature', name: 'Feature', color: '#3b82f6', isActive: true, tenantId: 'mock', createdAt: now() },
  { id: 'lbl-urgent', name: 'Urgent', color: '#f59e0b', isActive: true, tenantId: 'mock', createdAt: now() },
  { id: 'lbl-personal', name: 'Personal', color: '#8b5cf6', isActive: true, tenantId: 'mock', createdAt: now() },
]

function makeSeedTasks(): Task[] {
  const base = {
    tenantId: 'mock',
    description: null,
    assignedToId: null,
    assignedToName: null,
    parentId: null,
    labels: [],
    createdById: null,
    createdByName: null,
    createdAt: now(),
    updatedAt: now(),
  }
  return [
    { ...base, id: uid(), title: 'Setup payment gateway', status: 'todo' as const, priority: 'high' as const, dueDate: today(), position: 0 },
    { ...base, id: uid(), title: 'Update menu photos', status: 'todo' as const, priority: 'medium' as const, dueDate: null, position: 1 },
    { ...base, id: uid(), title: 'Review monthly report', status: 'in_progress' as const, priority: 'medium' as const, dueDate: null, position: 0 },
    { ...base, id: uid(), title: 'Fix login bug', status: 'in_progress' as const, priority: 'urgent' as const, dueDate: today(), position: 1, labels: ['lbl-bug'] },
    { ...base, id: uid(), title: 'Onboard new employee', status: 'done' as const, priority: 'low' as const, dueDate: null, position: 0 },
  ]
}

function matchesQuery(task: Task, query: TaskQuery): boolean {
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status]
    if (!statuses.includes(task.status)) return false
  }
  if (query.priority) {
    const priorities = Array.isArray(query.priority) ? query.priority : [query.priority]
    if (!priorities.includes(task.priority)) return false
  }
  if (query.assignedToId && task.assignedToId !== query.assignedToId) return false
  if (query.parentId !== undefined) {
    if (query.parentId === null && task.parentId !== null) return false
    if (query.parentId !== null && task.parentId !== query.parentId) return false
  }
  if (query.search) {
    const s = query.search.toLowerCase()
    if (!task.title.toLowerCase().includes(s)) return false
  }
  if (query.overdue && task.dueDate) {
    if (task.dueDate >= today()) return false
  }
  return true
}

export function createMockTasksProvider(): TasksDataProvider {
  let tasks = makeSeedTasks()
  const labels = [...SEED_LABELS]

  return {
    async getTasks(query) {
      return tasks.filter((t) => matchesQuery(t, query)).sort((a, b) => a.position - b.position)
    },

    async getTaskById(id) {
      return tasks.find((t) => t.id === id) ?? null
    },

    async getSubtasks(parentId) {
      return tasks.filter((t) => t.parentId === parentId).sort((a, b) => a.position - b.position)
    },

    async createTask(input: CreateTaskInput) {
      const statusTasks = tasks.filter((t) => t.status === (input.status ?? 'todo') && t.parentId === (input.parentId ?? null))
      const maxPos = statusTasks.reduce((max, t) => Math.max(max, t.position), -1)
      const task: Task = {
        id: uid(),
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'todo',
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate ?? null,
        assignedToId: input.assignedToId ?? null,
        assignedToName: null,
        parentId: input.parentId ?? null,
        labels: input.labels ?? [],
        position: maxPos + 1,
        createdById: null,
        createdByName: null,
        tenantId: 'mock',
        createdAt: now(),
        updatedAt: now(),
      }
      tasks.push(task)
      return task
    },

    async updateTask(id, input: UpdateTaskInput) {
      const idx = tasks.findIndex((t) => t.id === id)
      if (idx === -1) throw new Error('Task not found')
      tasks[idx] = { ...tasks[idx], ...input, updatedAt: now() } as Task
      return tasks[idx]
    },

    async deleteTask(id) {
      tasks = tasks.filter((t) => t.id !== id && t.parentId !== id)
    },

    async reorderTask(id, newPosition, status) {
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      task.status = status
      task.position = newPosition
      task.updatedAt = now()
    },

    async getLabels() {
      return labels.filter((l) => l.isActive)
    },

    async getSummary() {
      const topLevel = tasks.filter((t) => t.parentId === null)
      const d = today()
      return {
        total: topLevel.length,
        todo: topLevel.filter((t) => t.status === 'todo').length,
        inProgress: topLevel.filter((t) => t.status === 'in_progress').length,
        done: topLevel.filter((t) => t.status === 'done').length,
        overdue: topLevel.filter((t) => t.dueDate != null && t.dueDate < d && t.status !== 'done' && t.status !== 'cancelled').length,
        dueToday: topLevel.filter((t) => t.dueDate === d && t.status !== 'done' && t.status !== 'cancelled').length,
        highPriority: topLevel.filter((t) => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done' && t.status !== 'cancelled').length,
      }
    },
  }
}
