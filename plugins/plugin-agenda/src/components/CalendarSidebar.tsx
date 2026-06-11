import React from 'react'
import { Filter, X } from 'lucide-react'
import { useAgendaConfig, useAgendaStore } from '../AgendaContext'
import { useTranslation } from '@fayz/core'
import type { Professional } from '../types'

export function CalendarSidebar() {
  const t = useTranslation()
  const config = useAgendaConfig()
  const professionals = useAgendaStore((s) => s.professionals)
  const selectedProfIds = useAgendaStore((s) => s.selectedProfessionalIds)
  const selectedStatuses = useAgendaStore((s) => s.selectedStatuses)
  const selectedLocationId = useAgendaStore((s) => s.selectedLocationId)
  const setFilters = useAgendaStore((s) => s.setFilters)

  const hasFilters = selectedProfIds.length > 0 || selectedStatuses.length > 0 || !!selectedLocationId

  function toggleProfessional(id: string) {
    const next = selectedProfIds.includes(id)
      ? selectedProfIds.filter((p) => p !== id)
      : [...selectedProfIds, id]
    setFilters({ professionalIds: next })
  }

  function toggleStatus(value: string) {
    const next = selectedStatuses.includes(value)
      ? selectedStatuses.filter((s) => s !== value)
      : [...selectedStatuses, value]
    setFilters({ statuses: next })
  }

  function clearFilters() {
    setFilters({ professionalIds: [], statuses: [], locationId: null })
  }

  return (
    <div className="space-y-6">
      {/* Filters header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          {config.labels.filters}
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Professional filter */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('agenda.sidebar.agendas')}
        </label>
        <div className="mt-2 space-y-1">
          {professionals.map((prof) => (
            <label key={prof.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={selectedProfIds.length === 0 || selectedProfIds.includes(prof.id)}
                onChange={() => toggleProfessional(prof.id)}
                className="h-3.5 w-3.5 rounded border-muted-foreground/30"
              />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {prof.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-sm truncate">{prof.name}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('agenda.sidebar.status')}
        </label>
        <div className="mt-2 space-y-1">
          {config.statuses.map((status) => (
            <label key={status.value} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={selectedStatuses.length === 0 || selectedStatuses.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className="h-3.5 w-3.5 rounded border-muted-foreground/30"
              />
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-sm">{status.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Location filter */}
      {config.locations.length > 1 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('agenda.sidebar.location')}
          </label>
          <select
            value={selectedLocationId ?? ''}
            onChange={(e) => setFilters({ locationId: e.target.value || null })}
            className="mt-2 block w-full rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2 py-1.5 text-sm"
          >
            <option value="">{t('agenda.sidebar.allLocations')}</option>
            {config.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
