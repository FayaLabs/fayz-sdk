import React, { useEffect, useState, useMemo } from 'react'
import { UserPlus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { ListView } from '@fayz-ai/ui'
import { useCrmStore } from '../CrmContext'
import { useTranslation } from '@fayz-ai/core'
import { SubpageHeader } from '@fayz-ai/ui'
import type { Lead, LeadStatus } from '../types'

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-info-soft text-info-soft-foreground' },
  { value: 'contacted', label: 'Contacted', color: 'bg-magic-soft text-magic-soft-foreground' },
  { value: 'qualified', label: 'Qualified', color: 'bg-success-soft text-success-soft-foreground' },
  { value: 'unqualified', label: 'Unqualified', color: 'bg-muted text-muted-foreground' },
  { value: 'converted', label: 'Converted', color: 'bg-warning-soft text-warning-soft-foreground' },
]

const columns: ColumnDef<Lead, any>[] = [
  { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  {
    id: 'contact', header: 'Contact',
    cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.email || row.original.phone || '—'}</span>,
  },
  {
    accessorKey: 'sourceName', header: 'Source',
    cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{(getValue() as string) || '—'}</span>,
  },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string
      const opt = STATUS_OPTIONS.find((o) => o.value === status)
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${opt?.color ?? 'bg-muted text-muted-foreground'}`}>
          {opt?.label ?? status}
        </span>
      )
    },
  },
]

export function LeadListView({ onNew, onEdit }: { onNew?: () => void; onEdit?: (id: string) => void }) {
  const t = useTranslation()
  const leads = useCrmStore((s) => s.leads)
  const leadsLoading = useCrmStore((s) => s.leadsLoading)
  const fetchLeads = useCrmStore((s) => s.fetchLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([])

  useEffect(() => {
    fetchLeads({ status: statusFilter.length > 0 ? statusFilter : undefined, search: search || undefined })
  }, [statusFilter, search])

  // Multi-select tag filter: toggle individual statuses
  const tags = useMemo(() => STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })), [])

  return (
    <div className="space-y-4">
      <SubpageHeader title={t('crm.leads.title')} subtitle={`${leads.length} leads`} />
      <ListView<Lead>
        columns={columns}
        data={leads}
        loading={leadsLoading}
        searchPlaceholder={t('crm.leads.searchPlaceholder')}
        search={search}
        onSearchChange={setSearch}
        searchDebounce={0}
        tags={tags}
        activeTag={statusFilter.length === 1 ? statusFilter[0] : undefined}
        onTagChange={(v) => setStatusFilter(v ? [v as LeadStatus] : [])}
        newLabel={t('crm.leads.newLead')}
        onNew={onNew}
        onRowClick={(row) => onEdit?.(row.id)}
        emptyIcon={UserPlus}
        emptyMessage={t('crm.leads.noLeads')}
        emptyActionLabel={onNew ? t('crm.leads.captureFirst') : undefined}
        onEmptyAction={onNew}
      />
    </div>
  )
}
