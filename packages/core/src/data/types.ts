export interface CrudQuery {
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  filters?: Record<string, unknown>
}

export interface CrudResult<T> {
  data: T[]
  total: number
}

export interface DataProvider<T extends { id: string } = { id: string }> {
  list(query: CrudQuery): Promise<CrudResult<T>>
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
}
