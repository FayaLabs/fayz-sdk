import type {
  Task, TaskLabel, CreateTaskInput, UpdateTaskInput,
  TaskQuery, TasksSummary, TaskStatus,
} from '../types'

export interface TasksDataProvider {
  getTasks(query: TaskQuery): Promise<Task[]>
  getTaskById(id: string): Promise<Task | null>
  getSubtasks(parentId: string): Promise<Task[]>
  createTask(input: CreateTaskInput): Promise<Task>
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>
  deleteTask(id: string): Promise<void>
  reorderTask(id: string, newPosition: number, status: TaskStatus): Promise<void>
  getLabels(): Promise<TaskLabel[]>
  getSummary(): Promise<TasksSummary>
}
