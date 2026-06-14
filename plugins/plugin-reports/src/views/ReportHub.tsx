import React, { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { ReportCard } from '../components/ReportCard'
import { useReportsContext } from '../ReportsContext'
import type { ReportDef } from '../types'

interface ReportHubProps {
  onSelect: (report: ReportDef) => void
}

interface CategoryGroup {
  name: string
  reports: ReportDef[]
}

export function ReportHub({ onSelect }: ReportHubProps) {
  const t = useTranslation()
  const { config } = useReportsContext()
  const [search, setSearch] = useState('')

  const categories = useMemo(() => {
    const filtered = search
      ? config.reports.filter(
          (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.description?.toLowerCase().includes(search.toLowerCase()),
        )
      : config.reports

    const map = new Map<string, ReportDef[]>()
    for (const report of filtered) {
      const list = map.get(report.category) ?? []
      list.push(report)
      map.set(report.category, list)
    }

    const groups: CategoryGroup[] = []
    for (const [name, reports] of map) {
      groups.push({ name, reports })
    }
    return groups
  }, [config.reports, search])

  const totalReports = config.reports.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('reports.pageTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('reports.pageSubtitle')}</p>
      </div>

      {/* Search */}
      {totalReports > 6 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('reports.search')}
            className="pl-9"
          />
        </div>
      )}

      {/* Categories */}
      <div className="space-y-8">
        {categories.map((category) => (
            <div key={category.name} className="rounded-xl border bg-card shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">{category.name}</h2>
                <span className="text-sm text-muted-foreground">
                  {category.reports.length} {t('reports.reports')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.reports.map((report) => (
                  <ReportCard key={report.id} report={report} onClick={onSelect} />
                ))}
              </div>
            </div>
        ))}
      </div>

      {categories.length === 0 && search && (
        <div className="text-center py-12 text-muted-foreground">
          {t('reports.noResults')}
        </div>
      )}
    </div>
  )
}
