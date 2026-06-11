import { useState, useCallback, useRef } from 'react'
import type { ReportDef, ReportQueryState, ReportDateRange } from '../types'
import type { ReportDataProvider, ReportResult } from '../data/types'
import { dedup } from '../lib/dedup'

function defaultDateRange(): ReportDateRange {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return { from, to }
}

function buildDefaultFilters(report: ReportDef): Record<string, any> {
  const filters: Record<string, any> = {}
  for (const f of report.filters ?? []) {
    if (f.defaultValue !== undefined) filters[f.key] = f.defaultValue
  }
  return filters
}

export interface UseReportDataReturn {
  data: Record<string, any>[]
  total: number
  loading: boolean
  generated: boolean
  error: string | null
  query: ReportQueryState
  generate: () => void
  setDateRange: (range: ReportDateRange) => void
  setFilter: (key: string, value: any) => void
  setSort: (sortBy: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearch: (search: string) => void
}

export function useReportData(
  report: ReportDef,
  provider: ReportDataProvider,
  defaultPageSize: number = 50,
): UseReportDataReturn {
  const [query, setQuery] = useState<ReportQueryState>({
    dateRange: defaultDateRange(),
    filters: buildDefaultFilters(report),
    sortBy: report.dataSource.defaultSort,
    sortDir: report.dataSource.defaultSortDir ?? 'desc',
    page: 1,
    pageSize: defaultPageSize,
  })

  const [result, setResult] = useState<ReportResult>({ data: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryRef = useRef(query)
  queryRef.current = query

  const fetchData = useCallback(async (q: ReportQueryState) => {
    setLoading(true)
    setError(null)
    try {
      const res = await dedup(`report:${report.id}:${JSON.stringify(q)}`, () =>
        provider.fetch(report, q),
      )
      setResult(res)
      setGenerated(true)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load report')
      setResult({ data: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }, [report, provider])

  const generate = useCallback(() => {
    fetchData(queryRef.current)
  }, [fetchData])

  const setDateRange = useCallback((dateRange: ReportDateRange) => {
    setQuery((q) => ({ ...q, dateRange, page: 1 }))
  }, [])

  const setFilter = useCallback((key: string, value: any) => {
    setQuery((q) => ({ ...q, filters: { ...q.filters, [key]: value }, page: 1 }))
  }, [])

  const setSort = useCallback((sortBy: string) => {
    setQuery((q) => ({
      ...q,
      sortBy,
      sortDir: q.sortBy === sortBy && q.sortDir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }))
  }, [])

  const setPage = useCallback((page: number) => {
    setQuery((q) => ({ ...q, page }))
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setQuery((q) => ({ ...q, pageSize, page: 1 }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setQuery((q) => ({ ...q, search, page: 1 }))
  }, [])

  return {
    data: result.data,
    total: result.total,
    loading,
    generated,
    error,
    query,
    generate,
    setDateRange,
    setFilter,
    setSort,
    setPage,
    setPageSize,
    setSearch,
  }
}
