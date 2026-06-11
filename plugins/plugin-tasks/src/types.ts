// ---------------------------------------------------------------------------
// Tasks Plugin — Domain Types
// ---------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  assignedToId: string | null
  assignedToName: string | null
  parentId: string | null
  labels: string[]
  position: number
  createdById: string | null
  createdByName: string | null
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface TaskLabel {
  id: string
  name: string
  color: string
  isActive: boolean
  tenantId: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  assignedToId?: string | null
  parentId?: string | null
  labels?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  assignedToId?: string | null
  labels?: string[]
  position?: number
}

// ---------------------------------------------------------------------------
// Query types
// ---------------------------------------------------------------------------

export interface TaskQuery {
  status?: TaskStatus | TaskStatus[]
  priority?: TaskPriority | TaskPriority[]
  assignedToId?: string
  parentId?: string | null
  search?: string
  overdue?: boolean
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface TasksSummary {
  total: number
  todo: number
  inProgress: number
  done: number
  overdue: number
  dueToday: number
  highPriority: number
}
