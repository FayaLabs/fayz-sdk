import React, { useEffect, useState, useCallback } from 'react'
import { Clock, Plus, Trash2, Copy, Save } from 'lucide-react'
import { toast } from '@fayz-ai/ui'
import { useAgendaProvider, useAgendaStore } from '../AgendaContext'
import { getCurrentLocale, useTranslation } from '@fayz-ai/core'
import type { Schedule, SaveScheduleInput } from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAY_ANCHOR_SUNDAY = Date.UTC(2026, 0, 4)

interface DaySchedule {
  enabled: boolean
  periods: {
    id?: string
    startsAt: string
    endsAt: string
    locationId?: string | null
    metadata?: Record<string, unknown>
  }[]
}

type WeekSchedule = Record<number, DaySchedule>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function schedulesToWeek(schedules: Schedule[]): WeekSchedule {
  const week: WeekSchedule = {}
  for (let i = 0; i < 7; i++) {
    week[i] = { enabled: false, periods: [] }
  }
  for (const s of schedules) {
    if (s.dayOfWeek == null || !s.isActive) continue
    const day = week[s.dayOfWeek]
    day.enabled = true
    day.periods.push({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      locationId: s.locationId,
      metadata: s.metadata,
    })
  }
  // Sort periods
  for (const day of Object.values(week)) {
    day.periods.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }
  return week
}

function formatWeekdayShort(dayOfWeek: number, locale: string): string {
  const date = new Date(WEEKDAY_ANCHOR_SUNDAY + dayOfWeek * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date).replace('.', '')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkingHoursView() {
  const t = useTranslation()
  const locale = getCurrentLocale()
  const provider = useAgendaProvider()
  const professionals = useAgendaStore((s) => s.professionals)
  const profLoading = useAgendaStore((s) => s.professionalsLoading)
  const fetchProfessionals = useAgendaStore((s) => s.fetchProfessionals)

  const [selectedProfId, setSelectedProfId] = useState<string>('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [week, setWeek] = useState<WeekSchedule>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchProfessionals() }, [])
  useEffect(() => { if (professionals.length > 0 && !selectedProfId) setSelectedProfId(professionals[0].id) }, [professionals])

  const loadSchedules = useCallback(async (profId: string) => {
    if (!profId) return
    setLoading(true)
    try {
      const data = await provider.getSchedules(profId)
      setSchedules(data)
      setWeek(schedulesToWeek(data))
    } catch { /* ignore */ }
    setLoading(false)
  }, [provider])

  useEffect(() => { if (selectedProfId) loadSchedules(selectedProfId) }, [selectedProfId])

  function toggleDay(dayOfWeek: number) {
    setWeek((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        enabled: !prev[dayOfWeek]?.enabled,
        periods: prev[dayOfWeek]?.enabled ? [] : [{ startsAt: '08:00', endsAt: '18:00' }],
      },
    }))
  }

  function updatePeriod(dayOfWeek: number, idx: number, field: 'startsAt' | 'endsAt', value: string) {
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      const periods = [...day.periods]
      periods[idx] = { ...periods[idx], [field]: value }
      return { ...prev, [dayOfWeek]: { ...day, periods } }
    })
  }

  function addPeriod(dayOfWeek: number) {
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      const last = day.periods[day.periods.length - 1]
      day.periods = [...day.periods, { startsAt: last?.endsAt ?? '13:00', endsAt: '18:00' }]
      return { ...prev, [dayOfWeek]: day }
    })
  }

  function removePeriod(dayOfWeek: number, idx: number) {
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      day.periods = day.periods.filter((_, i) => i !== idx)
      if (day.periods.length === 0) day.enabled = false
      return { ...prev, [dayOfWeek]: day }
    })
  }

  function copyToAll(sourceDayOfWeek: number) {
    const source = week[sourceDayOfWeek]
    if (!source) return
    setWeek((prev) => {
      const next = { ...prev }
      for (let i = 0; i < 7; i++) {
        if (i === sourceDayOfWeek) continue
        next[i] = { enabled: source.enabled, periods: source.periods.map((p) => ({ startsAt: p.startsAt, endsAt: p.endsAt })) }
      }
      return next
    })
  }

  async function handleSave() {
    if (!selectedProfId) return
    setSaving(true)
    try {
      // Replace only weekly schedules. Date-specific exceptions are not
      // visible in this editor and must not be destroyed by a weekly save.
      const weeklySchedules = schedules.filter((s) => s.dayOfWeek != null)
      for (const s of weeklySchedules) {
        await provider.deleteSchedule(s.id)
      }
      // Create new ones
      for (const [dayStr, day] of Object.entries(week)) {
        const dayOfWeek = Number(dayStr)
        if (!day.enabled) continue
        for (const period of day.periods) {
          await provider.saveSchedule({
            assigneeId: selectedProfId,
            dayOfWeek,
            locationId: period.locationId ?? undefined,
            startsAt: period.startsAt,
            endsAt: period.endsAt,
            isActive: true,
            metadata: period.metadata,
          })
        }
      }
      toast.success(t('agenda.workingHours.saved'))
      loadSchedules(selectedProfId)
    } catch (err: any) {
      toast.error(t('agenda.workingHours.saveFailed'), { description: err?.message })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('agenda.workingHours.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('agenda.workingHours.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedProfId}
          className="flex items-center gap-2 rounded-lg bg-primary border border-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? t('agenda.workingHours.saving') : t('agenda.workingHours.save')}
        </button>
      </div>

      {/* Professional selector */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">{t('agenda.workingHours.professional')}</label>
        <select
          value={selectedProfId}
          onChange={(e) => setSelectedProfId(e.target.value)}
          className="mt-1 block w-full max-w-xs rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm"
        >
          {profLoading && <option>{t('agenda.confirmations.loading')}</option>}
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Schedule grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">{t('agenda.confirmations.loading')}</div>
      ) : (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
            const day = week[dayOfWeek] ?? { enabled: false, periods: [] }
            return (
              <div key={dayOfWeek} className="flex items-start gap-4 rounded-lg border p-4">
                {/* Day toggle */}
                <div className="flex w-24 shrink-0 items-center gap-2 pt-1">
                  <button
                    onClick={() => toggleDay(dayOfWeek)}
                    className={`h-4 w-4 rounded border ${day.enabled ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}
                  />
                  <span className={`text-sm font-medium ${day.enabled ? '' : 'text-muted-foreground'}`}>
                    {formatWeekdayShort(dayOfWeek, locale)}
                  </span>
                </div>

                {/* Periods */}
                {day.enabled ? (
                  <div className="flex flex-1 flex-col gap-2">
                    {day.periods.map((period, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={period.startsAt}
                          onChange={(e) => updatePeriod(dayOfWeek, idx, 'startsAt', e.target.value)}
                          className="rounded border bg-background px-2 py-1 text-sm"
                        />
                        <span className="text-muted-foreground">{t('agenda.workingHours.to')}</span>
                        <input
                          type="time"
                          value={period.endsAt}
                          onChange={(e) => updatePeriod(dayOfWeek, idx, 'endsAt', e.target.value)}
                          className="rounded border bg-background px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removePeriod(dayOfWeek, idx)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          title={t('agenda.workingHours.removePeriod')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button
                        onClick={() => addPeriod(dayOfWeek)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" /> {t('agenda.workingHours.addBreak')}
                      </button>
                      <button
                        onClick={() => copyToAll(dayOfWeek)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" /> {t('agenda.workingHours.copyToAll')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="pt-1 text-sm text-muted-foreground">{t('agenda.workingHours.dayOff')}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
