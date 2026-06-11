import React, { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react'
import { Clock, Plus, Trash2, Copy, Save, CalendarOff, CalendarPlus, Check, Settings, X } from 'lucide-react'
import { toast } from '@fayz/ui'
import {
  getSchedules,
  replaceWeeklySchedules,
  saveException,
  deleteException,
  parseBlockSettings,
} from '../../lib/schedule-service'
import type { ScheduleRecord, BlockSettings } from '../../lib/schedule-service'
import { getScheduleBlockConfig, subscribeScheduleBlockConfig } from '../../lib/schedule-config'
import type { ScheduleBlockConfig } from '../../lib/schedule-config'
import { useTranslation } from '@fayz/core'
import { BlockSettingsPopover } from './BlockSettingsPopover'
import { Card, CardContent } from '@fayz/ui'
import { Button } from '@fayz/ui'
import { Badge } from '@fayz/ui'
import { Skeleton } from '@fayz/ui'
import { DatePicker } from '@fayz/ui'
import { TimePicker } from '@fayz/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@fayz/ui'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@fayz/ui'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@fayz/ui'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon–Sun display order

interface Period {
  id?: string
  startsAt: string
  endsAt: string
  settings?: BlockSettings
}

interface DaySchedule {
  enabled: boolean
  periods: Period[]
}

type WeekSchedule = Record<number, DaySchedule>

interface ExceptionEntry {
  startDate: string
  endDate: string
  type: 'available' | 'unavailable'
  periods: { startsAt: string; endsAt: string }[]
  notes: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function schedulesToWeek(schedules: ScheduleRecord[]): WeekSchedule {
  const week: WeekSchedule = {}
  for (let i = 0; i < 7; i++) {
    week[i] = { enabled: false, periods: [] }
  }
  for (const s of schedules) {
    if (s.dayOfWeek == null || s.specificDate != null) continue
    const day = week[s.dayOfWeek]
    if (s.isActive) {
      day.enabled = true
      const settings = parseBlockSettings(s.metadata ?? {})
      const hasSettings = Object.values(settings).some((v) => v !== undefined)
      day.periods.push({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        settings: hasSettings ? settings : undefined,
      })
    }
  }
  for (const day of Object.values(week)) {
    day.periods.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }
  return week
}

function schedulesToExceptions(schedules: ScheduleRecord[]): ExceptionEntry[] {
  // Group by range key (rangeStart–rangeEnd or single date)
  const map = new Map<string, ExceptionEntry>()
  for (const s of schedules) {
    if (!s.specificDate) continue
    const meta = (s.metadata ?? {}) as Record<string, unknown>
    const rangeStart = (meta.rangeStart as string) ?? s.specificDate
    const rangeEnd = (meta.rangeEnd as string) ?? s.specificDate
    const key = `${rangeStart}__${rangeEnd}`
    const exType = (meta.exceptionType as string) === 'available' ? 'available' : 'unavailable'
    const notes = (meta.notes as string) ?? ''

    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        startDate: rangeStart,
        endDate: rangeEnd,
        type: exType,
        periods: s.isActive ? [{ startsAt: s.startsAt, endsAt: s.endsAt }] : [],
        notes,
      })
    } else if (s.isActive && s.specificDate === rangeStart) {
      existing.periods.push({ startsAt: s.startsAt, endsAt: s.endsAt })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.startDate.localeCompare(b.startDate))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PeriodRow — single time block as a horizontal row
// ---------------------------------------------------------------------------

interface PeriodRowProps {
  period: Period
  dayOfWeek: number
  blockConfig: ScheduleBlockConfig | null
  settingsOpen: boolean
  onUpdateTime: (field: 'startsAt' | 'endsAt', value: string) => void
  onUpdateBuffer: (value: number) => void
  onUpdateSettings: (settings: BlockSettings) => void
  onRemove: () => void
  onAddBlock: () => void
  onCopyToAll: () => void
  onToggleSettings: () => void
  onCloseSettings: () => void
}

function PeriodRow({
  period, blockConfig, dayOfWeek,
  settingsOpen, onUpdateTime, onUpdateBuffer, onUpdateSettings,
  onRemove, onCopyToAll, onToggleSettings, onCloseSettings,
  onAddBlock,
}: PeriodRowProps) {
  const t = useTranslation()
  const gearRef = useRef<HTMLButtonElement>(null)
  const bufferValue = period.settings?.bufferMinutes ?? blockConfig?.defaults.bufferMinutes ?? 0
  const hasCustomSettings = period.settings && Object.entries(period.settings).some(
    ([k, v]) => k !== 'bufferMinutes' && v !== undefined,
  )
  const dayName = t(`schedule.days.${DAY_KEYS[dayOfWeek]}`)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5 group">
        {/* Label */}
        {period.settings?.label && (
          <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 shrink-0">
            {period.settings.label}
          </span>
        )}

        {/* Time range */}
        <TimePicker value={period.startsAt} onChange={(v) => onUpdateTime('startsAt', v)} interval={30} className="w-[90px]" />
        <span className="text-xs text-muted-foreground/50">-</span>
        <TimePicker value={period.endsAt} onChange={(v) => onUpdateTime('endsAt', v)} interval={30} min={period.startsAt} className="w-[90px]" />

        {/* Buffer pill */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-1 shrink-0">
              <input
                type="number"
                min={0}
                max={120}
                value={bufferValue}
                onChange={(e) => onUpdateBuffer(Number(e.target.value) || 0)}
                className="w-8 bg-transparent text-xs text-center tabular-nums outline-none"
              />
              <span className="text-[10px] text-muted-foreground">{t('schedule.editor.min')}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{t('schedule.editor.bufferTooltip')}</TooltipContent>
        </Tooltip>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onRemove}
                className="p-1.5 rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('schedule.editor.removeInterval')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onAddBlock}
                className="p-1.5 rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('schedule.editor.newInterval', { day: dayName })}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onCopyToAll}
                className="p-1.5 rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('schedule.editor.copyToAll')}</TooltipContent>
          </Tooltip>

          {blockConfig && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button ref={gearRef} type="button" onClick={onToggleSettings}
                  className={`p-1.5 rounded-md transition-colors ${
                    hasCustomSettings
                      ? 'text-primary bg-primary/5'
                      : 'text-muted-foreground/30 hover:text-foreground hover:bg-muted'
                  }`}>
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('schedule.blockSettings.title')}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Settings popover */}
        {blockConfig && (
          <BlockSettingsPopover
            settings={period.settings ?? {}}
            onChange={onUpdateSettings}
            config={blockConfig}
            triggerRef={gearRef}
            open={settingsOpen}
            onClose={onCloseSettings}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ScheduleEditorProps {
  assigneeId: string
}

export function ScheduleEditor({ assigneeId }: ScheduleEditorProps) {
  const t = useTranslation()
  const [week, setWeek] = useState<WeekSchedule>({})
  const [exceptions, setExceptions] = useState<ExceptionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddException, setShowAddException] = useState(false)
  const blockConfig = useSyncExternalStore(subscribeScheduleBlockConfig, getScheduleBlockConfig)
  const [settingsPopover, setSettingsPopover] = useState<{ dayOfWeek: number; idx: number } | null>(null)
  const [weekDirty, setWeekDirty] = useState(false)

  // Lazy-fetch locations when showLocations is enabled but locations aren't loaded yet
  useEffect(() => {
    if (blockConfig?.showLocations && (!blockConfig.locations || blockConfig.locations.length === 0) && blockConfig.fetchLocations) {
      blockConfig.fetchLocations().catch(() => {})
    }
  }, [blockConfig?.showLocations, blockConfig?.locations?.length])

  // New exception form state
  const [newExStartDate, setNewExStartDate] = useState('')
  const [newExEndDate, setNewExEndDate] = useState('')
  const [newExType, setNewExType] = useState<'unavailable' | 'available'>('unavailable')
  const [newExPeriods, setNewExPeriods] = useState([{ startsAt: '09:00', endsAt: '17:00' }])
  const [newExNotes, setNewExNotes] = useState('')
  const [savingException, setSavingException] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSchedules(assigneeId)
      setWeek(schedulesToWeek(data))
      setExceptions(schedulesToExceptions(data))
      setWeekDirty(false)
    } catch {
      toast.error(t('schedule.editor.failedToLoad'))
    }
    setLoading(false)
  }, [assigneeId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- Weekly hours handlers ---

  function markDirty() { setWeekDirty(true) }

  function toggleDay(dayOfWeek: number) {
    markDirty()
    setWeek((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        enabled: !prev[dayOfWeek]?.enabled,
        periods: prev[dayOfWeek]?.enabled ? [] : [{ startsAt: '09:00', endsAt: '18:00' }],
      },
    }))
  }

  function updatePeriod(dayOfWeek: number, idx: number, field: 'startsAt' | 'endsAt', value: string) {
    markDirty()
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      const periods = [...day.periods]
      periods[idx] = { ...periods[idx], [field]: value }
      return { ...prev, [dayOfWeek]: { ...day, periods } }
    })
  }

  function addPeriod(dayOfWeek: number) {
    markDirty()
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      const last = day.periods[day.periods.length - 1]
      day.periods = [...day.periods, { startsAt: last?.endsAt ?? '13:00', endsAt: '18:00' }]
      return { ...prev, [dayOfWeek]: day }
    })
  }

  function removePeriod(dayOfWeek: number, idx: number) {
    markDirty()
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      day.periods = day.periods.filter((_, i) => i !== idx)
      if (day.periods.length === 0) day.enabled = false
      return { ...prev, [dayOfWeek]: day }
    })
  }

  function updatePeriodSettings(dayOfWeek: number, idx: number, settings: BlockSettings) {
    markDirty()
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      const periods = [...day.periods]
      periods[idx] = { ...periods[idx], settings }
      return { ...prev, [dayOfWeek]: { ...day, periods } }
    })
  }

  function updateBufferMinutes(dayOfWeek: number, idx: number, value: number) {
    markDirty()
    setWeek((prev) => {
      const day = { ...prev[dayOfWeek] }
      const periods = [...day.periods]
      const existing = periods[idx].settings ?? {}
      periods[idx] = { ...periods[idx], settings: { ...existing, bufferMinutes: value || undefined } }
      return { ...prev, [dayOfWeek]: { ...day, periods } }
    })
  }

  function copyToAll(sourceDayOfWeek: number) {
    markDirty()
    const source = week[sourceDayOfWeek]
    if (!source) return
    setWeek((prev) => {
      const next = { ...prev }
      for (let i = 0; i < 7; i++) {
        if (i === sourceDayOfWeek) continue
        next[i] = {
          enabled: source.enabled,
          periods: source.periods.map((p) => ({ startsAt: p.startsAt, endsAt: p.endsAt, settings: p.settings ? { ...p.settings } : undefined })),
        }
      }
      return next
    })
  }

  async function handleSaveWeekly() {
    setSaving(true)
    try {
      await replaceWeeklySchedules(assigneeId, week)
      toast.success(t('schedule.editor.saved'))
      loadData()
    } catch (err: any) {
      toast.error(t('schedule.editor.failedToSave'), { description: err?.message })
    }
    setSaving(false)
  }

  // --- Exception handlers ---

  async function handleAddException() {
    if (!newExStartDate) {
      toast.error(t('schedule.editor.selectStartDate'))
      return
    }
    const endDate = newExEndDate || newExStartDate
    if (endDate < newExStartDate) {
      toast.error(t('schedule.editor.endDateAfterStart'))
      return
    }
    setSavingException(true)
    try {
      await saveException({
        assigneeId,
        startDate: newExStartDate,
        endDate,
        type: newExType,
        periods: newExType === 'unavailable' ? [] : newExPeriods,
        notes: newExNotes || undefined,
      })
      toast.success(t('schedule.editor.exceptionAdded'))
      setShowAddException(false)
      setNewExStartDate('')
      setNewExEndDate('')
      setNewExType('unavailable')
      setNewExPeriods([{ startsAt: '09:00', endsAt: '17:00' }])
      setNewExNotes('')
      loadData()
    } catch (err: any) {
      toast.error(t('schedule.editor.failedToSaveException'), { description: err?.message })
    }
    setSavingException(false)
  }

  async function handleDeleteException(startDate: string, endDate: string) {
    try {
      await deleteException(assigneeId, startDate, endDate)
      toast.success(t('schedule.editor.exceptionRemoved'))
      loadData()
    } catch (err: any) {
      toast.error(t('schedule.editor.failedToDelete'), { description: err?.message })
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div>
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <Card>
            <CardContent className="p-0 divide-y">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-8" />
                  {i < 5 ? (
                    <>
                      <Skeleton className="h-8 w-24 rounded-lg" />
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </>
                  ) : (
                    <Skeleton className="h-4 w-20" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-44" /></div>
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <Card><CardContent className="flex items-center justify-center py-8"><Skeleton className="h-3 w-48" /></CardContent></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ---- Weekly Working Hours ---- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('schedule.editor.weeklyTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('schedule.editor.weeklyDescription')}</p>
            </div>
          </div>
          {weekDirty && (
            <Button size="sm" onClick={handleSaveWeekly} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          )}
        </div>

        {/* Day rows */}
        <Card>
          <CardContent className="p-0 divide-y">
            {WEEK_ORDER.map((dayOfWeek) => {
              const day = week[dayOfWeek] ?? { enabled: false, periods: [] }
              return (
                <div
                  key={dayOfWeek}
                  className={`flex items-start gap-4 px-4 py-3 transition-colors ${day.enabled ? '' : 'bg-muted/20'}`}
                >
                  {/* Day toggle checkbox + label */}
                  <button
                    type="button"
                    onClick={() => toggleDay(dayOfWeek)}
                    className="flex items-center gap-2.5 w-20 shrink-0 pt-1.5"
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                      day.enabled
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border-2 border-muted-foreground/25 hover:border-muted-foreground/40'
                    }`}>
                      {day.enabled && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={`text-sm font-medium ${day.enabled ? '' : 'text-muted-foreground/40'}`}>
                      {t(`schedule.days.${DAY_KEYS[dayOfWeek]}`)}
                    </span>
                  </button>

                  {/* Content */}
                  {day.enabled ? (
                    <div className="flex-1 space-y-2">
                      {day.periods.map((period, idx) => (
                        <PeriodRow
                          key={idx}
                          period={period}
                          dayOfWeek={dayOfWeek}
                          blockConfig={blockConfig}
                          settingsOpen={settingsPopover?.dayOfWeek === dayOfWeek && settingsPopover?.idx === idx}
                          onUpdateTime={(field, v) => updatePeriod(dayOfWeek, idx, field, v)}
                          onUpdateBuffer={(v) => updateBufferMinutes(dayOfWeek, idx, v)}
                          onUpdateSettings={(s) => updatePeriodSettings(dayOfWeek, idx, s)}
                          onRemove={() => removePeriod(dayOfWeek, idx)}
                          onAddBlock={() => addPeriod(dayOfWeek)}
                          onCopyToAll={() => copyToAll(dayOfWeek)}
                          onToggleSettings={() => setSettingsPopover(
                            settingsPopover?.dayOfWeek === dayOfWeek && settingsPopover?.idx === idx ? null : { dayOfWeek, idx }
                          )}
                          onCloseSettings={() => setSettingsPopover(null)}
                        />
                      ))}
                    </div>
                  ) : (
                    <TooltipProvider delayDuration={300}>
                      <div className="flex items-center gap-2 pt-1.5">
                        <span className="text-sm text-muted-foreground/40">{t('schedule.editor.unavailable')}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => toggleDay(dayOfWeek)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/25 text-muted-foreground/40 hover:border-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t('schedule.editor.addHoursFor', { day: t(`schedule.days.${DAY_KEYS[dayOfWeek]}`) })}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* ---- Date Exceptions ---- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
              <CalendarOff className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('schedule.editor.exceptionsTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('schedule.editor.exceptionsDescription')}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddException(true)}
          >
            <CalendarPlus className="h-4 w-4 mr-1.5" />
            {t('schedule.editor.addException')}
          </Button>
        </div>

        {/* Add exception modal */}
        <Modal open={showAddException} onOpenChange={setShowAddException}>
          <ModalContent size="md">
            <ModalHeader>
              <ModalTitle>{t('schedule.editor.addException')}</ModalTitle>
              <ModalDescription>{t('schedule.editor.exceptionsDescription')}</ModalDescription>
            </ModalHeader>

            <ModalBody className="space-y-5">
              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('schedule.editor.startDate')}</label>
                  <DatePicker
                    value={newExStartDate}
                    onChange={(v) => {
                      setNewExStartDate(v)
                      if (!newExEndDate || v > newExEndDate) setNewExEndDate(v)
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('schedule.editor.endDate')}</label>
                  <DatePicker
                    value={newExEndDate || newExStartDate}
                    onChange={setNewExEndDate}
                  />
                </div>
              </div>

              {/* Type — segmented tabs */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('schedule.editor.type')}</label>
                <Tabs value={newExType} onValueChange={(v) => setNewExType(v as 'unavailable' | 'available')}>
                  <TabsList className="h-9 w-full">
                    <TabsTrigger value="unavailable" className="text-xs gap-1.5 flex-1">
                      <CalendarOff className="h-3.5 w-3.5" />
                      {t('schedule.editor.unavailable')}
                    </TabsTrigger>
                    <TabsTrigger value="available" className="text-xs gap-1.5 flex-1">
                      <Clock className="h-3.5 w-3.5" />
                      {t('schedule.editor.customHours')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Custom hours — only when type=available */}
              {newExType === 'available' && (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground">{t('schedule.editor.workingHours')}</label>
                  {newExPeriods.map((period, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <TimePicker
                        value={period.startsAt}
                        onChange={(v) => {
                          const updated = [...newExPeriods]
                          updated[idx] = { ...updated[idx], startsAt: v }
                          setNewExPeriods(updated)
                        }}
                        interval={30}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">{t('schedule.editor.to')}</span>
                      <TimePicker
                        value={period.endsAt}
                        onChange={(v) => {
                          const updated = [...newExPeriods]
                          updated[idx] = { ...updated[idx], endsAt: v }
                          setNewExPeriods(updated)
                        }}
                        interval={30}
                        min={period.startsAt}
                        className="flex-1"
                      />
                      {newExPeriods.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewExPeriods(newExPeriods.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const last = newExPeriods[newExPeriods.length - 1]
                      setNewExPeriods([...newExPeriods, { startsAt: last?.endsAt ?? '13:00', endsAt: '18:00' }])
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> {t('schedule.editor.addTimeBlock')}
                  </button>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('schedule.editor.notes')}</label>
                <input
                  type="text"
                  value={newExNotes}
                  onChange={(e) => setNewExNotes(e.target.value)}
                  placeholder={t('schedule.editor.notesPlaceholder')}
                  className="block w-full rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" onClick={() => setShowAddException(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddException} disabled={savingException}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {savingException ? t('common.saving') : t('schedule.editor.saveException')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Exception list */}
        {exceptions.length > 0 ? (
          <Card>
            <CardContent className="p-0 divide-y">
              {exceptions.map((ex) => {
                const isRange = ex.startDate !== ex.endDate
                const dateLabel = isRange
                  ? `${formatDate(ex.startDate)} — ${formatDate(ex.endDate)}`
                  : formatDate(ex.startDate)
                return (
                  <div key={ex.startDate + ex.endDate} className="flex items-center justify-between px-4 py-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Type indicator dot */}
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        ex.type === 'unavailable' ? 'bg-destructive' : 'bg-success'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{dateLabel}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {ex.type === 'unavailable' ? t('schedule.editor.unavailable') : t('schedule.editor.customHours')}
                          </Badge>
                          {ex.type === 'available' && ex.periods.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {ex.periods.map((p) => `${p.startsAt} — ${p.endsAt}`).join(', ')}
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{ex.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteException(ex.startDate, ex.endDate)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0 ml-2"
                      title={t('schedule.editor.removeException')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ) : (
          !showAddException && (
            <Card>
              <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {t('schedule.editor.noExceptions')}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
