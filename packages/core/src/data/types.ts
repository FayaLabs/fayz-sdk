export interface CrudQuery {
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  filters?: Record<string, unknown>
  /**
   * Default 'exact' — a CRUD pager needs the total. It is a second aggregate
   * over the filtered set, and on the live pool cost ~1070ms against ~270ms for
   * the rows themselves. Callers that only want rows pass 'none' (total: 0).
   */
  countMode?: 'exact' | 'none'
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
