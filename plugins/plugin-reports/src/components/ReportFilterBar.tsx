import React, { useEffect, useState } from 'react'
import { DatePicker } from '@fayz-ai/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@fayz-ai/ui'
import { Input } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { ReportFilterDef, ReportDateRange, ReportFilterOption } from '../types'

interface ReportFilterBarProps {
  dateRange: ReportDateRange
  onDateRangeChange: (range: ReportDateRange) => void
  filters: ReportFilterDef[]
  filterValues: Record<string, any>
  onFilterChange: (key: string, value: any) => void
}

export function ReportFilterBar({
  dateRange,
  onDateRangeChange,
  filters,
  filterValues,
  onFilterChange,
}: ReportFilterBarProps) {
  const t = useTranslation()

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Date range — always present */}
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('reports.from')}</label>
          <DatePicker
            value={dateRange.from}
            onChange={(v) => onDateRangeChange({ ...dateRange, from: v })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('reports.to')}</label>
          <DatePicker
            value={dateRange.to}
            onChange={(v) => onDateRangeChange({ ...dateRange, to: v })}
          />
        </div>
      </div>

      {/* Custom filters */}
      {filters.map((filter) => (
        <FilterControl
          key={filter.key}
          filter={filter}
          value={filterValues[filter.key]}
          onChange={(v) => onFilterChange(filter.key, v)}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual filter control
// ---------------------------------------------------------------------------

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: ReportFilterDef
  value: any
  onChange: (value: any) => void
}) {
  const [options, setOptions] = useState<ReportFilterOption[]>(
    Array.isArray(filter.options) ? filter.options : [],
  )

  useEffect(() => {
    if (typeof filter.options === 'function') {
      filter.options().then(setOptions)
    }
  }, [filter.options])

  if (filter.type === 'select') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{filter.label}</label>
        <Select value={value ?? ''} onValueChange={(v) => onChange(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={filter.placeholder ?? filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (filter.type === 'text') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{filter.label}</label>
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={filter.placeholder ?? filter.label}
          className="w-[180px]"
        />
      </div>
    )
  }

  if (filter.type === 'number') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{filter.label}</label>
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={filter.placeholder ?? filter.label}
          className="w-[120px]"
        />
      </div>
    )
  }

  return null
}
