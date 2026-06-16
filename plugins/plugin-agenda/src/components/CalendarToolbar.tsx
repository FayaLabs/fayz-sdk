import React from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { SegmentedControl } from '@fayz-ai/ui'
import { useAgendaConfig } from '../AgendaContext'
import { useTranslation } from '@fayz-ai/core'

interface CalendarToolbarProps {
  title: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: string) => void
  currentView: string
  onNewAppointment: () => void
}

const VIEW_OPTION_KEYS = [
  { key: 'dayGridMonth', labelKey: 'agenda.calendar.viewMonth' },
  { key: 'resourceTimeGridWeek', labelKey: 'agenda.calendar.viewWeek' },
  { key: 'resourceTimeGridDay', labelKey: 'agenda.calendar.viewDay' },
  { key: 'listWeek', labelKey: 'agenda.calendar.viewAgenda' },
] as const

export function CalendarToolbar({
  title, onPrev, onNext, onToday, onViewChange, currentView, onNewAppointment,
}: CalendarToolbarProps) {
  const config = useAgendaConfig()
  const t = useTranslation()

  return (
    <div className="flex items-center justify-between pb-4">
      {/* Left: nav controls + date */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="flex h-8 items-center justify-center rounded-lg border px-2 text-sm hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('agenda.toolbar.previous')}</span>
          </button>
          <button
            onClick={onToday}
            className="flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
          >
            {t('agenda.toolbar.today')}
          </button>
          <button
            onClick={onNext}
            className="flex h-8 items-center justify-center rounded-lg border px-2 text-sm hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors"
          >
            <span className="hidden sm:inline">{t('agenda.toolbar.next')}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>

      {/* Right: view switcher + new */}
      <div className="flex items-center gap-3">
        <SegmentedControl
          size="md"
          options={VIEW_OPTION_KEYS.map((opt) => ({ value: opt.key, label: t(opt.labelKey) }))}
          value={currentView}
          onChange={onViewChange}
          aria-label="Calendar view"
        />

        <button
          onClick={onNewAppointment}
          className="flex items-center gap-2 rounded-lg bg-primary border border-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{config.labels.newAppointment}</span>
        </button>
      </div>
    </div>
  )
}
