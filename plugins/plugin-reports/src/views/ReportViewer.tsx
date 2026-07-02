import React, { useMemo } from 'react'
import { ArrowLeft, Play, SlidersHorizontal, Construction, Loader2, Printer } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import { DataTable } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useReportsContext } from '../ReportsContext'
import { useReportData } from '../hooks/useReportData'
import { reportColumnsToTanstack } from '../lib/columns'
import { ReportFilterBar } from '../components/ReportFilterBar'
import { ReportPagination } from '../components/ReportPagination'
import { ReportSummaryRow } from '../components/ReportSummaryRow'
import { ExportDropdown } from '../components/ExportDropdown'
import type { ReportDef } from '../types'

interface ReportViewerProps {
  report: ReportDef
  onBack: () => void
}

export function ReportViewer({ report, onBack }: ReportViewerProps) {
  const t = useTranslation()
  const { config, provider } = useReportsContext()
  const {
    data,
    total,
    loading,
    generated,
    error,
    query,
    generate,
    setDateRange,
    setFilter,
    setPage,
    setPageSize,
  } = useReportData(report, provider, config.defaultPageSize)

  const isAvailable = report.available !== false
  const tanstackColumns = useMemo(
    () => reportColumnsToTanstack(report.columns, config.currency.code),
    [report.columns, config.currency.code],
  )

  return (
    <div className="space-y-4">
      {/* Breadcrumb — hidden in print */}
      <div className="flex items-center gap-1.5 text-sm no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('reports.pageTitle')}
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{report.name}</span>
      </div>

      <div>
        <h2 className="text-lg font-bold">{report.name}</h2>
        {report.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
        )}
      </div>

      {/* Filters + Generate — hidden in print */}
      <div className="flex flex-wrap items-end gap-3 no-print">
        <ReportFilterBar
          dateRange={query.dateRange}
          onDateRangeChange={setDateRange}
          filters={report.filters ?? []}
          filterValues={query.filters}
          onFilterChange={setFilter}
        />
        <Button onClick={generate} disabled={loading || !isAvailable} size="sm" className="h-9">
          {loading
            ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            : <Play className="h-3.5 w-3.5 mr-1.5" />
          }
          {t('reports.generate')}
        </Button>
        {generated && (
          <>
            <ExportDropdown
              columns={report.columns}
              data={data}
              filename={report.id}
              currency={config.currency.code}
              title={report.name}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              {t('reports.print')}
            </Button>
          </>
        )}
      </div>

      {/* Print-only: compact filter summary as document header */}
      {generated && (
        <div className="print-only hidden text-[10px] border-b pb-2 mb-2">
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {query.dateRange.from && (
              <span><strong>{t('reports.filterFrom')}:</strong> {new Date(query.dateRange.from + 'T12:00').toLocaleDateString()}</span>
            )}
            {query.dateRange.to && (
              <span><strong>{t('reports.filterTo')}:</strong> {new Date(query.dateRange.to + 'T12:00').toLocaleDateString()}</span>
            )}
            {Object.entries(query.filters).map(([key, value]) =>
              value ? <span key={key}><strong>{key}:</strong> {String(value)}</span> : null
            )}
            <span><strong>{t('reports.filterResults')}:</strong> {total}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty state — before generate */}
      {!generated && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          {isAvailable ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">{t('reports.emptyStateTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t('reports.emptyStateDescription')}</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Construction className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">{t('reports.unavailableTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t('reports.unavailableDescription')}</p>
            </>
          )}
        </div>
      )}

      {/* Results — only shown after generate */}
      {(generated || loading) && (
        <>
          <DataTable
            columns={tanstackColumns}
            data={data}
            loading={loading}
            skeletonRows={5}
            emptyMessage={t('reports.noResults')}
            variant="card"
            compact
          />

          {report.showSummary && !loading && (
            <ReportSummaryRow
              columns={report.columns}
              data={data}
              currency={config.currency.code}
            />
          )}

          {!loading && (
            <div className="no-print">
              <ReportPagination
                page={query.page}
                pageSize={query.pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
