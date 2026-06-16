import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { injectCalendarStyles } from '../calendar-styles'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { EventInput, EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core'
import { ChevronLeft, ChevronRight, Plus, ChevronDown, Settings } from 'lucide-react'
import { usePluginPrefs } from '@fayz-ai/saas'
import { getCurrentLocale } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import { useAgendaConfig, useAgendaStore } from '../AgendaContext'
import { useAgendaSettings } from '../hooks/useAgendaSettings'
import { MiniCalendar } from '../components/MiniCalendar'
import { AppointmentModal } from '../components/AppointmentModal'
import { AppointmentPopover } from '../components/AppointmentPopover'
import { PersonLink } from '@fayz-ai/saas'
import { EventContextMenu } from '../components/EventContextMenu'
import { ConfirmDialog } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import type { CalendarBooking, Schedule } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bookingToEvent(booking: CalendarBooking, statusColors: Record<string, string>): EventInput {
  const color = statusColors[booking.status] ?? '#6b7280'
  const serviceNames = booking.services?.map((s) => s.name).join(', ') ?? ''
  return {
    id: booking.id,
    resourceId: booking.professionalId ?? undefined,
    title: booking.clientName ?? 'Unknown',
    start: booking.startsAt,
    end: booking.endsAt ?? undefined,
    backgroundColor: color + '30',
    borderColor: color,
    textColor: color,
    extendedProps: { booking, serviceNames },
  }
}

/**
 * Generate FullCalendar background events showing unavailable time.
 * For each day, creates background blocks for the gaps OUTSIDE working hours
 * within the visible business hours window. This grays out non-working time.
 */
function generateAvailabilityEvents(
  schedules: Schedule[],
  professionals: { id: string }[],
  dateRange: { start: string; end: string } | null,
  businessHours?: { startTime: string; endTime: string },
  locationMap?: Map<string, string>,
): EventInput[] {
  if (!dateRange || schedules.length === 0) return []

  const bgEvents: EventInput[] = []
  const startDate = new Date(dateRange.start)
  const endDate = new Date(dateRange.end)
  const bizStart = businessHours?.startTime ?? '08:00'
  const bizEnd = businessHours?.endTime ?? '20:00'

  // Group schedules by assignee
  const byAssignee = new Map<string, Schedule[]>()
  for (const s of schedules) {
    const aid = s.assigneeId
    if (!aid) continue
    const list = byAssignee.get(aid) ?? []
    list.push(s)
    byAssignee.set(aid, list)
  }

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  function minutesToTime(m: number): string {
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  }

  const bizStartMin = timeToMinutes(bizStart)
  const bizEndMin = timeToMinutes(bizEnd)

  for (const prof of professionals) {
    const profSchedules = byAssignee.get(prof.id) ?? []

    // Separate weekly and date-specific schedules
    const weekly = profSchedules.filter((s) => s.dayOfWeek != null && !s.specificDate)
    const exceptions = profSchedules.filter((s) => s.specificDate != null)
    const exceptionDates = new Set(exceptions.map((s) => s.specificDate!))

    const current = new Date(startDate)
    while (current < endDate) {
      const dateStr = current.toISOString().slice(0, 10)
      const dayOfWeek = current.getDay()

      // Get working periods for this day
      let daySchedules: Schedule[]
      if (exceptionDates.has(dateStr)) {
        daySchedules = exceptions.filter((s) => s.specificDate === dateStr && s.isActive)
      } else {
        daySchedules = weekly.filter((s) => s.dayOfWeek === dayOfWeek && s.isActive)
      }

      // Convert working periods to sorted minute ranges, preserving locationId
      const workRanges = daySchedules
        .map((s) => {
          const locId = s.locationId ?? (s.metadata?.locationId as string | undefined)
          return {
            start: timeToMinutes(s.startsAt),
            end: timeToMinutes(s.endsAt),
            locationName: locId && locationMap ? locationMap.get(locId) : undefined,
          }
        })
        .sort((a, b) => a.start - b.start)

      // Compute unavailable gaps within business hours
      let cursor = bizStartMin
      for (const range of workRanges) {
        const availStart = Math.max(range.start, bizStartMin)
        const availEnd = Math.min(range.end, bizEndMin)

        // Gap before this working range = unavailable
        if (cursor < availStart) {
          bgEvents.push({
            resourceId: prof.id,
            start: dateStr + 'T' + minutesToTime(cursor) + ':00',
            end: dateStr + 'T' + minutesToTime(availStart) + ':00',
            display: 'background',
            classNames: ['fc-unavailable-bg'],
          })
        }

        // Location label on available range
        if (availStart < availEnd && range.locationName) {
          bgEvents.push({
            id: `loc-${prof.id}-${dateStr}-${minutesToTime(availStart)}`,
            resourceId: prof.id,
            start: dateStr + 'T' + minutesToTime(availStart) + ':00',
            end: dateStr + 'T' + minutesToTime(availStart + 20) + ':00',
            title: range.locationName,
            display: 'auto',
            editable: false,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            textColor: '#a3a3a3',
            classNames: ['fc-location-label'],
            extendedProps: { isLocationLabel: true },
          })
        }

        cursor = Math.max(cursor, availEnd)
      }

      // Gap after last working range = unavailable
      if (cursor < bizEndMin) {
        bgEvents.push({
          resourceId: prof.id,
          start: dateStr + 'T' + minutesToTime(cursor) + ':00',
          end: dateStr + 'T' + minutesToTime(bizEndMin) + ':00',
          display: 'background',
          classNames: ['fc-unavailable-bg'],
        })
      }


      current.setDate(current.getDate() + 1)
    }
  }

  return bgEvents
}

// ---------------------------------------------------------------------------
// Loading skeleton — mimics the resource-timegrid-week layout
// ---------------------------------------------------------------------------

function CalendarSkeleton({ profCount = 2 }: { profCount?: number }) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const hours = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

  return (
    <div className="flex-1 overflow-hidden animate-pulse">
      <div className="flex border-b" style={{ paddingLeft: 56 }}>
        {Array.from({ length: profCount }).map((_, pi) => (
          <div key={pi} className="flex-1 border-r last:border-r-0 py-2 px-3">
            <div className="flex items-center justify-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex border-b" style={{ paddingLeft: 56 }}>
        {Array.from({ length: profCount }).map((_, pi) => (
          <div key={pi} className="flex-1 flex border-r last:border-r-0">
            {days.map((d) => (
              <div key={d} className="flex-1 py-1.5 text-center">
                <span className="text-[10px] text-muted-foreground/40">{d}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="relative">
        {hours.map((h) => (
          <div key={h} className="flex border-b border-border/30" style={{ height: 50 }}>
            <div className="w-14 shrink-0 pr-2 text-right">
              <span className="text-[10px] text-muted-foreground/30">{h}</span>
            </div>
            <div className="flex-1 flex">
              {Array.from({ length: profCount * 7 }).map((_, ci) => (
                <div key={ci} className={`flex-1 border-r border-border/20 ${Math.floor(ci / 7) % 2 === 1 ? 'bg-muted/20' : ''}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const VIEW_OPTIONS = [
  { key: 'resourceTimeGridDay', labelKey: 'agenda.calendar.viewDay' },
  { key: 'resourceTimeGridWeek', labelKey: 'agenda.calendar.viewWeek' },
  { key: 'dayGridMonth', labelKey: 'agenda.calendar.viewMonth' },
] as const

// ---------------------------------------------------------------------------
// Calendar View
// ---------------------------------------------------------------------------

export function CalendarView() {
  injectCalendarStyles()
  const config = useAgendaConfig()
  const t = useTranslation()
  const currentLocale = getCurrentLocale()
  const fcLocale = currentLocale === 'pt-BR' ? ptBrLocale : undefined
  const calendarRef = useRef<FullCalendar>(null)
  const prefs = usePluginPrefs('agenda', { calendarView: config.defaultCalendarView ?? 'resourceTimeGridWeek' })
  const agendaSettings = useAgendaSettings()
  const effectiveBusinessHours = {
    startTime: agendaSettings.startTime,
    endTime: agendaSettings.endTime,
  }

  const bookings = useAgendaStore((s) => s.bookings)
  const bookingsLoading = useAgendaStore((s) => s.bookingsLoading)
  const professionals = useAgendaStore((s) => s.professionals)
  const professionalsLoading = useAgendaStore((s) => s.professionalsLoading)
  const currentView = useAgendaStore((s) => s.currentView)
  const selectedProfIds = useAgendaStore((s) => s.selectedProfessionalIds)
  const selectedStatuses = useAgendaStore((s) => s.selectedStatuses)
  const schedules = useAgendaStore((s) => s.schedules)
  const fetchBookings = useAgendaStore((s) => s.fetchBookings)
  const fetchProfessionals = useAgendaStore((s) => s.fetchProfessionals)
  const fetchLocations = useAgendaStore((s) => s.fetchLocations)
  const storeLocations = useAgendaStore((s) => s.locations)
  const fetchSchedules = useAgendaStore((s) => s.fetchSchedules)
  const rescheduleBooking = useAgendaStore((s) => s.rescheduleBooking)
  const setView = useAgendaStore((s) => s.setView)
  const setFilters = useAgendaStore((s) => s.setFilters)
  const _openModal = useAgendaStore((s) => s.openAppointmentModal)
  const closeModal = useAgendaStore((s) => s.closeAppointmentModal)
  const modalState = useAgendaStore((s) => s.appointmentModal)

  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null)
  const [popoverVisible, _setPopoverVisible] = useState(false)
  const popoverVisibleRef = useRef(false)
  const setPopoverVisible = useCallback((v: boolean) => { popoverVisibleRef.current = v; _setPopoverVisible(v) }, [])
  const [contextMenu, setContextMenu] = useState<{ booking: CalendarBooking; x: number; y: number } | null>(null)
  const [contextMenuVisible, _setContextMenuVisible] = useState(false)
  const contextMenuVisibleRef = useRef(false)
  const setContextMenuVisible = useCallback((v: boolean) => { contextMenuVisibleRef.current = v; _setContextMenuVisible(v) }, [])
  const [scheduleConfirm, setScheduleConfirm] = useState<{ onConfirm: () => void } | null>(null)
  const [calendarTitle, setCalendarTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [profSectionOpen, setProfSectionOpen] = useState(true)
  const [statusSectionOpen, setStatusSectionOpen] = useState(false)
  const [visibleRange, setVisibleRange] = useState<{ start: string; end: string } | null>(null)

  // Wrap openModal to always dismiss popover/context menu first
  const openModal: typeof _openModal = useCallback((...args) => {
    setPopoverVisible(false); setSelectedBooking(null); setPopoverAnchor(null)
    setContextMenuVisible(false); setContextMenu(null)
    _openModal(...args)
  }, [_openModal])

  const statusColors = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of config.statuses) map[s.value] = s.color
    return map
  }, [config.statuses])

  useEffect(() => {
    fetchProfessionals(); fetchSchedules()
    if (config.modules.locationSelection) fetchLocations()
  }, [])

  const resources = useMemo(() => {
    const filtered = selectedProfIds.length > 0
      ? professionals.filter((p) => selectedProfIds.includes(p.id))
      : professionals
    return filtered.map((p) => ({
      id: p.id, title: p.name,
      extendedProps: { avatarUrl: p.avatarUrl, locationName: p.locationName },
    }))
  }, [professionals, selectedProfIds])

  const bookingEvents = useMemo(() =>
    bookings.map((b) => bookingToEvent(b, statusColors)), [bookings, statusColors])

  // Merge static config locations with dynamically fetched locations
  const allLocations = useMemo(() => {
    const map = new Map<string, string>()
    for (const loc of config.locations) map.set(loc.id, loc.name)
    for (const loc of storeLocations) map.set(loc.id, loc.name)
    return map
  }, [config.locations, storeLocations])

  const locationMap = useMemo(() => {
    if (!config.modules.locationSelection || allLocations.size === 0) return undefined
    return allLocations
  }, [config.modules.locationSelection, allLocations])

  const availabilityEvents = useMemo(() =>
    generateAvailabilityEvents(schedules, professionals, visibleRange, effectiveBusinessHours, locationMap),
    [schedules, professionals, visibleRange, effectiveBusinessHours, locationMap])

  const events = useMemo(() =>
    [...bookingEvents, ...availabilityEvents], [bookingEvents, availabilityEvents])

  // ── Calendar handlers ──
  const handleDatesSet = useCallback((arg: { startStr: string; endStr: string; view: { title: string; type: string } }) => {
    setCalendarTitle(arg.view.title)
    setView(arg.view.type)
    setVisibleRange({ start: arg.startStr, end: arg.endStr })
    fetchBookings({ start: arg.startStr, end: arg.endStr })
  }, [fetchBookings, setView])

  // Double-click → open edit directly
  // Right-click → context menu
  const handleEventDidMount = useCallback((arg: { event: any; el: HTMLElement }) => {
    const booking = arg.event.extendedProps?.booking as CalendarBooking | undefined
    if (booking) arg.el.setAttribute('data-booking-id', booking.id)
    arg.el.addEventListener('dblclick', (e) => {
      e.preventDefault()
      e.stopPropagation()
      skipClickRef.current = true
      const booking = arg.event.extendedProps.booking as CalendarBooking
      setSelectedBooking(null)
      setPopoverAnchor(null)
      setContextMenu(null)
      openModal('edit', { bookingId: booking.id })
    })
    arg.el.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const booking = arg.event.extendedProps.booking as CalendarBooking
      const menuW = 210, menuH = 200
      let x = e.clientX + 4
      let y = e.clientY + 4
      if (x + menuW > window.innerWidth - 12) x = x - menuW
      if (y + menuH > window.innerHeight - 12) y = y - menuH
      setContextMenu({ booking, x, y })
      setContextMenuVisible(true)
      setSelectedBooking(null)
      setPopoverAnchor(null)
    })
  }, [])

  // Flag to suppress single-click after a double-click
  const skipClickRef = useRef(false)

  // Hover timer — show popover after 4s hover on a booking event
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEventMouseEnter = useCallback((arg: { event: any; el: HTMLElement }) => {
    if (arg.event.display === 'background') return
    if (arg.event.extendedProps?.isLocationLabel) return
    const booking = arg.event.extendedProps.booking as CalendarBooking
    if (!booking) return

    hoverTimerRef.current = setTimeout(() => {
      const rect = arg.el.getBoundingClientRect()
      const popW = 320, popH = 340
      let x = rect.right + 8
      let y = rect.top + rect.height / 2 - popH / 2
      if (x + popW > window.innerWidth - 16) x = rect.left - popW - 8
      if (x < 16) x = Math.max(16, rect.left + rect.width / 2 - popW / 2)
      if (y + popH > window.innerHeight - 16) y = window.innerHeight - popH - 16
      if (y < 16) y = 16
      setSelectedBooking(booking)
      setPopoverAnchor({ x, y })
      setPopoverVisible(true)
    }, 3000)
  }, [])

  const handleEventMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  // Single click — open popover instantly, or slide to new position if already open
  const handleEventClick = useCallback((arg: EventClickArg) => {
    if (skipClickRef.current) { skipClickRef.current = false; return }
    // Ignore clicks on background availability events and location labels
    if (arg.event.display === 'background') return
    if (arg.event.extendedProps?.isLocationLabel) return
    setContextMenu(null); setContextMenuVisible(false)
    const booking = arg.event.extendedProps.booking as CalendarBooking
    if (!booking) return
    const rect = arg.el.getBoundingClientRect()
    const popW = 320, popH = 340
    let x = rect.right + 8
    let y = rect.top + rect.height / 2 - popH / 2
    if (x + popW > window.innerWidth - 16) x = rect.left - popW - 8
    if (x < 16) x = Math.max(16, rect.left + rect.width / 2 - popW / 2)
    if (y + popH > window.innerHeight - 16) y = window.innerHeight - popH - 16
    if (y < 16) y = 16
    // Always update — if popover is already open it slides to the new position
    setSelectedBooking(booking)
    setPopoverAnchor({ x, y })
    setPopoverVisible(true)
  }, [])

  // Find the schedule block covering a given time slot for a professional
  const findScheduleForSlot = useCallback((professionalId: string | undefined, dateTimeStr: string): Schedule | null => {
    if (!professionalId) return null
    const dt = new Date(dateTimeStr)
    const dateStr = dt.toISOString().slice(0, 10)
    const dayOfWeek = dt.getDay()
    const timeMin = dt.getHours() * 60 + dt.getMinutes()

    const profSchedules = schedules.filter((s) => s.assigneeId === professionalId)
    const exceptions = profSchedules.filter((s) => s.specificDate === dateStr && s.isActive)
    const weekly = profSchedules.filter((s) => s.dayOfWeek === dayOfWeek && s.isActive && !s.specificDate)
    const daySchedules = exceptions.length > 0 ? exceptions : weekly

    for (const s of daySchedules) {
      const [sh, sm] = s.startsAt.split(':').map(Number)
      const [eh, em] = s.endsAt.split(':').map(Number)
      if (timeMin >= sh * 60 + sm && timeMin < eh * 60 + em) return s
    }
    return null
  }, [schedules])

  const handleSelect = useCallback((arg: DateSelectArg) => {
    calendarRef.current?.getApi().unselect()

    // Don't open create if popover/context menu is showing — dismiss them instead
    if (popoverVisibleRef.current || contextMenuVisibleRef.current) {
      setPopoverVisible(false); setSelectedBooking(null); setPopoverAnchor(null)
      setContextMenuVisible(false); setContextMenu(null)
      return
    }

    const professionalId = arg.resource?.id
    const schedule = findScheduleForSlot(professionalId, arg.startStr)

    const proceed = () => {
      const locId = schedule?.locationId ?? (schedule?.metadata?.locationId as string | undefined)
      openModal('create', { prefill: { startsAt: arg.startStr, endsAt: arg.endStr, professionalId, locationId: locId || undefined } })
    }

    // Warn if no schedule covers this slot
    if (!schedule) {
      setScheduleConfirm({ onConfirm: proceed })
      return
    }

    proceed()
  }, [openModal, findScheduleForSlot])

  const handleEventDrop = useCallback(async (arg: EventDropArg) => {
    const booking = arg.event.extendedProps.booking as CalendarBooking
    try { await rescheduleBooking(booking.id, arg.event.startStr, arg.event.endStr, arg.newResource?.id ?? undefined) }
    catch { arg.revert() }
  }, [rescheduleBooking])

  const handleViewChange = useCallback((v: string) => {
    calendarRef.current?.getApi().changeView(v)
    prefs.set('calendarView', v)
  }, [prefs])
  const handlePrev = useCallback(() => calendarRef.current?.getApi().prev(), [])
  const handleNext = useCallback(() => calendarRef.current?.getApi().next(), [])
  const handleToday = useCallback(() => { calendarRef.current?.getApi().today(); setSelectedDate(new Date()) }, [])

  function handleMiniDateSelect(date: Date) {
    setSelectedDate(date)
    calendarRef.current?.getApi().gotoDate(date)
  }

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

  // Alternating resource backgrounds — apply via DOM after render
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Responsive day headers — collapse weekday names to a single initial (S M T
  // W T F S, Google-Calendar style) when day columns get too narrow. Measured
  // from the actual rendered column width so it adapts to resource count + view.
  const [dayHeaderCompact, setDayHeaderCompact] = useState(false)
  useEffect(() => {
    const container = wrapperRef.current
    if (!container) return
    let frame = 0
    const measure = () => {
      // Measure an actual DAY column ([data-date]) — in resource views the first
      // .fc-col-header-cell is the wide resource header, not a day column.
      const cell = container.querySelector('.fc-col-header-cell[data-date]') as HTMLElement | null
      if (!cell) return
      const colWidth = cell.getBoundingClientRect().width
      // Collapse to single-letter ONLY when the full weekday label can't fit.
      // Measure the widest full line ("WED" / "12/14") in the header's font so
      // the breakpoint adapts to font + locale instead of a magic number.
      const cushion = (cell.querySelector('.fc-col-header-cell-cushion') as HTMLElement | null) ?? cell
      const cs = getComputedStyle(cushion)
      const probe = document.createElement('span')
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;top:-9999px'
      probe.style.fontSize = cs.fontSize
      probe.style.fontWeight = cs.fontWeight
      probe.style.fontFamily = cs.fontFamily
      probe.style.letterSpacing = cs.letterSpacing
      probe.style.textTransform = cs.textTransform
      document.body.appendChild(probe)
      probe.textContent = 'Wed'
      const weekdayWidth = probe.getBoundingClientRect().width
      probe.textContent = '12/14'
      const dateWidth = probe.getBoundingClientRect().width
      probe.remove()
      const needed = Math.max(weekdayWidth, dateWidth) + 12 // text + cushion padding
      setDayHeaderCompact(colWidth < needed)
    }
    // FullCalendar reflows its inner day columns on a later tick than the
    // container resize, so re-measure across a few frames to read settled widths.
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
      timers.forEach(clearTimeout)
      timers.length = 0
      timers.push(setTimeout(measure, 130), setTimeout(measure, 330))
    }
    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(container)
    return () => { cancelAnimationFrame(frame); timers.forEach(clearTimeout); ro.disconnect() }
  }, [resources, currentView, visibleRange])

  const applyResourceStriping = useCallback(() => {
    const container = wrapperRef.current
    if (!container) return
    const resourceIds = resources.map((r: { id: string }) => r.id)
    if (resourceIds.length < 2) return
    container.querySelectorAll('[data-resource-id]').forEach((el: Element) => {
      const rid = el.getAttribute('data-resource-id')
      const idx = rid ? resourceIds.indexOf(rid) : -1
      el.classList.toggle('fc-resource-alt', idx % 2 === 1)
    })
  }, [resources])

  useEffect(() => {
    applyResourceStriping()
    const t1 = setTimeout(applyResourceStriping, 100)
    const t2 = setTimeout(applyResourceStriping, 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [applyResourceStriping, currentView, visibleRange, bookings])

  // Listen for cross-plugin booking open requests (e.g., from financial invoice detail)
  useEffect(() => {
    function handleOpenBooking(e: Event) {
      const bookingId = (e as CustomEvent).detail?.bookingId
      if (bookingId) openModal('edit', { bookingId })
    }
    window.addEventListener('agenda:open-booking', handleOpenBooking)
    return () => window.removeEventListener('agenda:open-booking', handleOpenBooking)
  }, [openModal])

  // Custom day header: weekday + date stacked. When columns get narrow it
  // collapses the weekday to a single initial (S / 16, Google-Calendar style).
  // Always returns explicit content — returning undefined renders an EMPTY
  // header in the React adapter rather than falling back to the default.
  const dayHeaderContent = useCallback((arg: any) => {
    const date: Date = arg.date
    const dateLocale = currentLocale === 'pt-BR' ? 'pt-BR' : 'en'
    // Inline styles (not CSS classes) so stacking is guaranteed regardless of
    // the runtime style-injection state.
    const wrapStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }
    const dateStyle: React.CSSProperties = { fontSize: '0.65rem', opacity: 0.75 }
    if (dayHeaderCompact) {
      const letter = date.toLocaleDateString(dateLocale, { weekday: 'narrow' })
      return (
        <div style={wrapStyle}>
          <span style={{ fontWeight: 600 }}>{letter}</span>
          <span style={dateStyle}>{date.getDate()}</span>
        </div>
      )
    }
    const weekday = date.toLocaleDateString(dateLocale, { weekday: 'short' })
    return (
      <div style={wrapStyle}>
        <span>{weekday}</span>
        <span style={dateStyle}>{`${date.getMonth() + 1}/${date.getDate()}`}</span>
      </div>
    )
  }, [dayHeaderCompact, currentLocale])

  const resourceLabelContent = useCallback((arg: any) => {
    const { id, title, extendedProps } = arg.resource
    const initials = title.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{initials}</div>
        <div className="min-w-0">
          <PersonLink
            personId={id}
            name={title}
            size="sm"
            tab="schedule"
            profileHref={`#/registry/staff/${id}/schedule`}
          />
          {extendedProps?.locationName && <p className="text-[10px] text-muted-foreground truncate">{extendedProps.locationName}</p>}
        </div>
      </div>
    )
  }, [])

  const eventContent = useCallback((arg: any) => {
    // Location label events — render as a small tag
    if (arg.event.extendedProps?.isLocationLabel) {
      return (
        <div className="px-1.5 py-0.5 overflow-hidden">
          <p className="text-[10px] font-medium truncate">{arg.event.title}</p>
        </div>
      )
    }
    const serviceNames = arg.event.extendedProps?.serviceNames
    const start = arg.event.start
    const end = arg.event.end
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const timeRange = start && end ? `${fmt(start)} – ${fmt(end)}` : start ? fmt(start) : ''
    return (
      <div className="px-1.5 py-0.5 overflow-hidden leading-tight h-full">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[11px] font-semibold truncate">{arg.event.title}</p>
          {serviceNames && <p className="text-[10px] opacity-60 truncate shrink-0 max-w-[45%] text-right">{serviceNames}</p>}
        </div>
        {timeRange && <p className="text-[9px] opacity-50">{timeRange}</p>}
      </div>
    )
  }, [])

  return (
    <div className="flex h-[calc(100vh-7.5rem)]">
      {/* ═══ LEFT SIDEBAR — hidden on mobile ═══ */}
      <div className="hidden md:flex w-[220px] shrink-0 flex-col overflow-y-auto py-4 px-3 mr-4">
        {/* + Create button */}
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 rounded-button bg-primary text-primary-foreground border border-primary pl-3 pr-4 py-1.5 text-sm font-semibold hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-all mb-6 w-fit"
        >
          <Plus className="h-4 w-4" />
          {t('agenda.sidebar.create')}
        </button>

        {/* Mini month calendar */}
        <MiniCalendar selectedDate={selectedDate} onDateSelect={handleMiniDateSelect} />

        <div className="h-px bg-border my-4" />

        {/* Agendas */}
        <button onClick={() => setProfSectionOpen((p) => !p)}
          className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1 transition-colors">
          <span>Agendas</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${profSectionOpen ? '' : '-rotate-90'}`} />
        </button>
        {profSectionOpen && (
          <div className="mt-1.5 space-y-0.5">
            {professionals.map((prof) => {
              const active = selectedProfIds.length === 0 || selectedProfIds.includes(prof.id)
              return (
                <label key={prof.id} className="flex items-center gap-2.5 rounded px-1 py-1 cursor-pointer hover:bg-muted/50 transition-colors">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 transition-colors ${
                    active ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  }`}>
                    {active && <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <span className={`text-xs truncate ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{prof.name}</span>
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleProfessional(prof.id)} />
                </label>
              )
            })}
          </div>
        )}

        <div className="h-px bg-border my-4" />

        {/* Status */}
        <button onClick={() => setStatusSectionOpen((p) => !p)}
          className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1 transition-colors">
          <span>Status</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${statusSectionOpen ? '' : '-rotate-90'}`} />
        </button>
        {statusSectionOpen && (
          <div className="mt-1.5 space-y-0.5">
            {config.statuses.map((st) => {
              const active = selectedStatuses.length === 0 || selectedStatuses.includes(st.value)
              return (
                <label key={st.value} className="flex items-center gap-2.5 rounded px-1 py-1 cursor-pointer hover:bg-muted/50 transition-colors">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 transition-colors"
                    style={{ borderColor: active ? st.color : st.color + '40', backgroundColor: active ? st.color : 'transparent' }}>
                    {active && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <span className={`text-xs ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{st.label}</span>
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleStatus(st.value)} />
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b">
          <div className="flex items-center gap-3">
            {/* Mobile create button */}
            <button onClick={() => openModal('create')}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>

            <button onClick={handleToday}
              className="rounded-md border px-3 py-1 text-sm font-medium hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
              {t('agenda.toolbar.today')}
            </button>
            <div className="flex items-center gap-0.5">
              <button onClick={handlePrev} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={handleNext} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h1 className="text-base sm:text-lg font-normal truncate">{calendarTitle}</h1>
          </div>

          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1">
              {VIEW_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => handleViewChange(opt.key)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    currentView === opt.key
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}>
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.hash = '/settings/agenda'}
              title="Agenda Settings"
              className="ml-1"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar */}
        {professionalsLoading && professionals.length === 0 ? (
          <CalendarSkeleton profCount={2} />
        ) : (
        <div ref={wrapperRef} className="flex-1 overflow-hidden agenda-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, resourceTimeGridPlugin, interactionPlugin, listPlugin]}
            initialView={prefs.get('calendarView') === 'timeGridWeek' ? 'resourceTimeGridWeek' : prefs.get('calendarView')}
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            resources={resources}
            events={events}
            headerToolbar={false}
            locale={fcLocale}
            height="100%"
            slotMinTime={effectiveBusinessHours.startTime + ':00'}
            slotMaxTime={effectiveBusinessHours.endTime + ':00'}
            slotDuration={{ minutes: config.slotDuration }}
            allDaySlot={false}
            nowIndicator={true}
            editable={config.modules.dragAndDrop}
            selectable={true}
            selectMirror={true}
            eventOverlap={false}
            datesSet={handleDatesSet}
            eventDidMount={handleEventDidMount}
            eventClick={handleEventClick}
            eventMouseEnter={handleEventMouseEnter}
            eventMouseLeave={handleEventMouseLeave}
            select={handleSelect}
            eventDrop={handleEventDrop}
            resourceLabelContent={resourceLabelContent}
            dayHeaderContent={dayHeaderContent}
            eventContent={eventContent}
            resourceOrder="title"
            stickyHeaderDates={true}
            expandRows={false}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          />
        </div>
        )}
      </div>

      {/* Popover — stays mounted until animation finishes */}
      {selectedBooking && popoverAnchor && popoverVisible && (
        <AppointmentPopover booking={selectedBooking} position={popoverAnchor}
          onClose={() => {
            // Called AFTER the popover's exit animation finishes
            setPopoverVisible(false)
            setSelectedBooking(null)
            setPopoverAnchor(null)
          }}
          onEdit={(id) => {
            setPopoverVisible(false)
            setSelectedBooking(null)
            setPopoverAnchor(null)
            openModal('edit', { bookingId: id })
          }} />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <EventContextMenu
          booking={contextMenu.booking}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => { setContextMenuVisible(false); setContextMenu(null) }}
          onEdit={(id) => { setContextMenuVisible(false); setContextMenu(null); openModal('edit', { bookingId: id }) }}
        />
      )}

      {/* No-schedule confirm */}
      <ConfirmDialog
        open={!!scheduleConfirm}
        variant="warning"
        title={t('agenda.calendar.noScheduleConfirm')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { const cb = scheduleConfirm?.onConfirm; setScheduleConfirm(null); cb?.() }}
        onCancel={() => setScheduleConfirm(null)}
      />

      {/* Modal — always mounted, Radix controls open/close animation */}
      <AppointmentModal
        open={modalState.open}
        mode={modalState.mode}
        bookingId={modalState.bookingId}
        prefill={modalState.prefill}
        initialTab={modalState.initialTab}
        onClose={closeModal}
        onCreated={(newId) => {
          // After a short delay (let calendar re-render), find the event and show popover
          setTimeout(() => {
            const booking = bookings.find((b: CalendarBooking) => b.id === newId)
            if (!booking) return
            const el = document.querySelector(`[data-booking-id="${newId}"]`) as HTMLElement | null
            if (el) {
              const rect = el.getBoundingClientRect()
              const popW = 320, popH = 340
              let x = rect.right + 8
              let y = rect.top + rect.height / 2 - popH / 2
              if (x + popW > window.innerWidth - 16) x = rect.left - popW - 8
              if (y + popH > window.innerHeight - 16) y = window.innerHeight - popH - 16
              if (y < 16) y = 16
              setSelectedBooking(booking)
              setPopoverAnchor({ x, y })
              setPopoverVisible(true)
            }
          }, 400)
        }} />
    </div>
  )
}
