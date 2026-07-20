import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock, AlertTriangle, X, User, Briefcase, FileText, CircleDot, Plus, MapPin, Calendar, DollarSign, CheckSquare, Ban, Check, HandCoins } from 'lucide-react'

const BOOKING_TYPE_ICONS: Record<string, React.ElementType> = {
  Calendar, CheckSquare, Ban,
}
import {
  Modal, ModalContent, ModalTitle,
} from '@fayz-ai/ui'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@fayz-ai/ui'
import { cn } from '@fayz-ai/ui'
import { SearchCombobox, type ComboboxOption } from './SearchCombobox'
import { PersonLink } from '@fayz-ai/saas'
import { BookingPaymentPanel } from './BookingPaymentPanel'
import { CrudDetailPage } from '@fayz-ai/saas'
import { CrudFormPage } from '@fayz-ai/saas'
import { Button } from '@fayz-ai/ui'
import { useAgendaConfig, useAgendaProvider, useAgendaStore } from '../AgendaContext'
import { useTranslation } from '@fayz-ai/core'
import { getCurrentLocale } from '@fayz-ai/core'
import { isStatusAvailable } from '../types'
import type { CreateBookingInput, BookingTypeId } from '../types'
import type { ExternalBookingSource } from '../config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtCurrency(amount: number, locale: string, code: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount)
}

function formatCompactDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

interface ServiceItem { serviceId: string; name: string; durationMinutes: number; price: number }
interface CancellationReasonItem { id: string; label: string; requiresNotes?: boolean }

// ---------------------------------------------------------------------------
// Inline editable number — allows clearing, commits on blur/enter
// ---------------------------------------------------------------------------

function InlineNumber({ value, onChange, min = 0, step = 1, className, disabled, tooltip }: {
  value: number; onChange: (v: number) => void; min?: number; step?: number
  className?: string; disabled?: boolean; tooltip?: string
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => { if (!focused) setDraft(String(value)) }, [value, focused])

  function commit() {
    setFocused(false)
    const v = parseFloat(draft)
    if (!isNaN(v) && v >= min) {
      onChange(v)
    } else {
      setDraft(String(value))
    }
  }

  const input = (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => { setFocused(true); e.target.select() }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
      disabled={disabled}
      className={cn(
        'text-right text-[11px] text-muted-foreground bg-transparent border-b border-transparent hover:border-muted-foreground/40 focus:border-foreground focus:outline-none tabular-nums',
        className,
      )}
    />
  )

  if (!tooltip) return input

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>{input}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Custom Status Select
// ---------------------------------------------------------------------------

function StatusSelect({ value, onChange, statuses, bookingDate }: {
  value: string; onChange: (v: string) => void
  statuses: Array<{ value: string; label: string; color: string; availableWhen?: string }>
  bookingDate?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const current = statuses.find((s) => s.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const btnRef = useRef<HTMLButtonElement>(null)
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)

  function handleOpen() {
    if (btnRef.current) setDropRect(btnRef.current.getBoundingClientRect())
    setOpen((p) => !p)
  }

  return (
    <div ref={ref} className="relative flex-1">
      <button ref={btnRef} type="button" onClick={handleOpen}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30 transition-colors text-left w-full">
        {current && <>
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
          <span>{current.label}</span>
        </>}
        <svg className="ml-auto h-3 w-3 text-muted-foreground shrink-0" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && dropRect && createPortal(
        <div ref={dropdownRef} data-modal-passthrough style={{ position: 'fixed', left: dropRect.left, top: dropRect.bottom + 4, width: dropRect.width, zIndex: 9999, pointerEvents: 'auto' }}
          className="fayz-glass-surface rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
          {statuses.map((s: any) => {
            const available = !bookingDate || isStatusAvailable(s as any, bookingDate)
            return (
              <button key={s.value} type="button" disabled={!available}
                onClick={() => { if (available) { onChange(s.value); setOpen(false) } }}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
                  !available ? 'opacity-30 cursor-not-allowed' : s.value === value ? 'bg-muted/30' : 'hover:bg-muted/50'
                }`}>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span>{s.label}</span>
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Professional Select — compact inline dropdown with initials
// ---------------------------------------------------------------------------

function ProfessionalSelect({ value, onChange, professionals }: {
  value: string; onChange: (v: string) => void
  professionals: Array<{ id: string; name: string }>
}) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = professionals.find((p) => p.id === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex-1">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30 transition-colors text-left">
        {current ? (
          <span>{current.name}</span>
        ) : (
          <span className="text-muted-foreground">{t('agenda.appointment.selectProfessional')}</span>
        )}
        <svg className="ml-auto h-3 w-3 text-muted-foreground shrink-0" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="fayz-glass-surface absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
          {professionals.map((p: any) => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p.id); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors ${p.id === value ? 'bg-muted/30' : ''}`}>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Location Select — compact inline dropdown
// ---------------------------------------------------------------------------

function LocationSelect({ value, onChange, locations }: {
  value: string; onChange: (v: string) => void
  locations: Array<{ id: string; name: string }>
}) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = locations.find((l) => l.id === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex-1">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30 transition-colors text-left">
        {current ? (
          <span>{current.name}</span>
        ) : (
          <span className="text-muted-foreground">{t('agenda.appointment.selectLocation')}</span>
        )}
        <svg className="ml-auto h-3 w-3 text-muted-foreground shrink-0" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="fayz-glass-surface absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
          {locations.map((l: any) => (
            <button key={l.id} type="button"
              onClick={() => { onChange(l.id); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors ${l.id === value ? 'bg-muted/30' : ''}`}>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Appointment Modal — Google Calendar-inspired compact layout
// ---------------------------------------------------------------------------

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  bookingId?: string
  prefill?: Partial<CreateBookingInput> & { endsAt?: string }
  initialTab?: string
  externalSource?: ExternalBookingSource
  onClose: () => void
  onCreated?: (bookingId: string, source?: ExternalBookingSource) => void
}

export function AppointmentModal({ open, mode, bookingId, prefill, initialTab, externalSource, onClose, onCreated }: Props) {
  const t = useTranslation()
  const locale = getCurrentLocale()
  const config = useAgendaConfig()
  const provider = useAgendaProvider()
  const initialSnapshot = useRef<string>('')
  const createBooking = useAgendaStore((s) => s.createBooking)
  const updateBooking = useAgendaStore((s) => s.updateBooking)
  const deleteBooking = useAgendaStore((s) => s.deleteBooking)
  const fetchBookings = useAgendaStore((s) => s.fetchBookings)
  const agendaDateRange = useAgendaStore((s) => s.dateRange)
  const professionals = useAgendaStore((s) => s.professionals)
  const storeLocations = useAgendaStore((s) => s.locations)

  // --- State ---
  // Default to the first configured booking type (e.g. 'event' in simple mode,
  // 'appointment' otherwise) so single-type agendas resolve their type cleanly.
  const defaultBookingType = (config.bookingTypes[0]?.id ?? 'appointment') as BookingTypeId
  const [loading, setLoading] = useState(mode === 'edit')
  const [bookingType, setBookingType] = useState<BookingTypeId>(prefill?.kind ?? defaultBookingType)
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState(prefill?.clientId ?? '')
  const [clientSearch, setClientSearch] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [professionalId, setProfessionalId] = useState(prefill?.professionalId ?? '')
  const [locationId, setLocationId] = useState(prefill?.locationId ?? '')
  const [services, setServices] = useState<ServiceItem[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [date, setDate] = useState(() => {
    if (prefill?.startsAt) return prefill.startsAt.slice(0, 10)
    return new Date().toISOString().slice(0, 10)
  })
  const [startTime, setStartTime] = useState(() => {
    if (prefill?.startsAt) {
      const d = new Date(prefill.startsAt)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return '09:00'
  })
  const [status, setStatus] = useState('scheduled')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [quickCreate, setQuickCreate] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [clientOptions, setClientOptions] = useState<ComboboxOption[]>([])
  const [clientSearching, setClientSearching] = useState(false)
  const [serviceOptions, setServiceOptions] = useState<ComboboxOption[]>([])
  const [initialServiceOptions, setInitialServiceOptions] = useState<ComboboxOption[]>([])
  const [editingDate, setEditingDate] = useState(false)
  const [editingTime, setEditingTime] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [editOrderTotal, setEditOrderTotal] = useState(0)
  const [editPaymentStatus, setEditPaymentStatus] = useState<import('../financial-bridge').BookingPaymentStatus>('none')
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false)
  const [modalTab, setModalTab] = useState<'appointment' | 'client' | 'financial'>('appointment')
  const [clientData, setClientData] = useState<Record<string, any> | null>(null)
  const [clientDataLoading, setClientDataLoading] = useState(false)
  const [clientEditing, setClientEditing] = useState(false)
  const [cancellationReasons, setCancellationReasons] = useState<CancellationReasonItem[]>([])
  const [cancellationReasonId, setCancellationReasonId] = useState('')
  const [cancellationNotes, setCancellationNotes] = useState('')
  const [cancellationReasonsLoading, setCancellationReasonsLoading] = useState(false)

  // Active booking type config
  const activeType = config.bookingTypes.find((bt) => bt.id === bookingType) ?? config.bookingTypes[0]

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return
    setClientId(prefill?.clientId ?? ''); setClientSearch(''); setClientPhone('')
    setProfessionalId(prefill?.professionalId ?? ''); setLocationId(prefill?.locationId ?? ''); setServices([])
    setServiceSearch(''); setNotes(''); setStatus('scheduled'); setShowNotes(false)
    setConflict(false); setLoading(mode === 'edit')
    setQuickCreate(false); setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setCreatingClient(false)
    setBookingType(prefill?.kind ?? defaultBookingType); setTitle('')
    setEditingDate(false); setEditingTime(false); setConfirmingDelete(false); setDeleting(false)
    setEditOrderId(null); setEditOrderTotal(0); setEditPaymentStatus('none'); setPaymentStatusLoading(false)
    setClientData(null); setClientDataLoading(false); setClientEditing(false)
    setCancellationReasonId(''); setCancellationNotes(''); setCancellationReasonsLoading(false)
    setModalTab((initialTab as 'appointment' | 'client' | 'financial') || 'appointment')
    if (!prefill?.professionalId && professionals.length === 1) setProfessionalId(professionals[0].id)
    setDate(() => {
      if (prefill?.startsAt) return prefill.startsAt.slice(0, 10)
      return new Date().toISOString().slice(0, 10)
    })
    setStartTime(() => {
      if (prefill?.startsAt) {
        const d = new Date(prefill.startsAt)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      }
      return '09:00'
    })
  }, [open])

  // Edit: load existing
  useEffect(() => {
    if (!open || mode !== 'edit' || !bookingId) return
    setLoading(true)
    provider.getBookingById(bookingId).then((b) => {
      if (!b) { setLoading(false); return }
      setBookingType((b.kind as BookingTypeId) ?? defaultBookingType)
      setTitle(b.clientName ?? '')
      setClientId(b.clientId ?? ''); setClientSearch(b.clientName ?? '')
      setProfessionalId(b.professionalId ?? ''); setLocationId(b.locationId ?? '')
      setDate(b.startsAt.slice(0, 10))
      const d = new Date(b.startsAt)
      setStartTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
      setStatus(b.status); setNotes(b.notes ?? '')
      if (b.notes) setShowNotes(true)
      if (b.services) setServices(b.services.map((s: any) => ({
        serviceId: s.serviceId ?? '', name: s.name, durationMinutes: s.durationMinutes, price: s.price,
      })))
      setEditOrderId(b.orderId ?? null)
      setEditOrderTotal(b.orderTotal ?? 0)
      setEditPaymentStatus(b.paymentStatus ?? 'none')
      // Save initial snapshot for dirty check
      const svcSnap = b.services ? b.services.map((s: any) => ({ id: s.serviceId ?? '', dur: s.durationMinutes, price: s.price })) : []
      initialSnapshot.current = JSON.stringify({
        title: b.clientName ?? '',
        clientId: b.clientId ?? '', professionalId: b.professionalId ?? '', locationId: b.locationId ?? '',
        date: b.startsAt.slice(0, 10),
        startTime: `${String(new Date(b.startsAt).getHours()).padStart(2, '0')}:${String(new Date(b.startsAt).getMinutes()).padStart(2, '0')}`,
        status: b.status, notes: b.notes ?? '', cancellationReasonId: '', cancellationNotes: '', services: svcSnap,
      })
      setLoading(false)
      // Resolve payment status from bridge if available
      if (b.orderId && config.financialBridge) {
        setPaymentStatusLoading(true)
        config.financialBridge.resolvePaymentStatuses([b.orderId]).then((map) => {
          const summary = map.get(b.orderId!)
          if (summary) {
            setEditPaymentStatus(summary.status)
            setEditOrderTotal(summary.totalAmount)
          }
        }).catch(() => {}).finally(() => setPaymentStatusLoading(false))
      }
    }).catch(() => setLoading(false))
  }, [open, mode, bookingId])

  // Fetch client data when client tab is opened
  useEffect(() => {
    if (modalTab !== 'client' || !clientId || !config.contactLookup || clientData) return
    setClientDataLoading(true)
    config.contactLookup.getById(clientId).then((result) => {
      setClientData(result?.data ?? null)
      setClientDataLoading(false)
    }).catch(() => setClientDataLoading(false))
  }, [modalTab, clientId])

  useEffect(() => {
    if (!open || status !== 'cancelled' || !config.cancellationDetails || cancellationReasons.length > 0) return
    setCancellationReasonsLoading(true)
    config.cancellationDetails.listReasons()
      .then((reasons) => setCancellationReasons(reasons))
      .catch(() => setCancellationReasons([]))
      .finally(() => setCancellationReasonsLoading(false))
  }, [open, status, config.cancellationDetails, cancellationReasons.length])

  // Fetch initial service list when modal opens
  useEffect(() => {
    if (!open || !config.serviceLookup) return
    const lookup = config.serviceLookup
    const fetch = lookup.list ? () => lookup.list!() : () => lookup.search('')
    fetch().then((results) => {
      const opts = results.map((r: any) => ({ id: r.id, label: r.label, subtitle: r.subtitle, price: r.price, data: r.data }))
      setInitialServiceOptions(opts)
    }).catch(() => setInitialServiceOptions([]))
  }, [open])

  // Search effects
  useEffect(() => {
    if (!config.contactLookup || clientSearch.length < 1 || clientId) { setClientOptions([]); setClientSearching(false); return }
    setClientSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await config.contactLookup!.search(clientSearch)
        setClientOptions(results.map((r: any) => ({ id: r.id, label: r.label, subtitle: r.subtitle, price: r.price, data: r.data })))
      } catch { setClientOptions([]) }
      setClientSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [clientSearch, clientId])

  useEffect(() => {
    if (!config.serviceLookup || serviceSearch.length < 1) { setServiceOptions([]); return }
    const timer = setTimeout(async () => {
      try {
        const results = await config.serviceLookup!.search(serviceSearch)
        setServiceOptions(results.map((r: any) => ({ id: r.id, label: r.label, subtitle: r.subtitle, price: r.price, data: r.data })))
      } catch { setServiceOptions([]) }
    }, 250)
    return () => clearTimeout(timer)
  }, [serviceSearch])

  // Computed
  const serviceDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0)
  const selectionDuration = useMemo(() => {
    if (!prefill?.startsAt || !prefill?.endsAt) return 0
    return Math.round((new Date(prefill.endsAt).getTime() - new Date(prefill.startsAt).getTime()) / 60000)
  }, [prefill?.startsAt, prefill?.endsAt])
  const totalDuration = serviceDuration > 0 ? serviceDuration : selectionDuration
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0)
  const { currency } = config

  const endTime = useMemo(() => {
    const [h, m] = startTime.split(':').map(Number)
    const total = h * 60 + m + totalDuration
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }, [startTime, totalDuration])

  // Conflict check
  useEffect(() => {
    if (!professionalId || totalDuration === 0) { setConflict(false); return }
    const timer = setTimeout(() => {
      provider.checkConflict({
        assigneeId: professionalId, startsAt: `${date}T${startTime}:00`, endsAt: `${date}T${endTime}:00`, excludeBookingId: bookingId,
      }).then(setConflict).catch(() => setConflict(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [professionalId, date, startTime, endTime, bookingId])

  function selectClient(opt: ComboboxOption) {
    setClientId(opt.id); setClientSearch(opt.label); setClientOptions([])
    setClientPhone((opt.data?.phone as string) ?? '')
  }
  function addService(opt: ComboboxOption) {
    const duration = (opt.data?.duration_minutes as number) || 60
    setServices((p) => [...p, { serviceId: opt.id, name: opt.label, durationMinutes: duration, price: opt.price ?? 0 }])
    setServiceSearch(''); setServiceOptions([])
  }
  function removeService(idx: number) { setServices((p) => p.filter((_, i) => i !== idx)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    try {
      const startsAt = new Date(`${date}T${startTime}:00`).toISOString()
      if (mode === 'create') {
        const newBooking = await createBooking({ kind: bookingType, clientId, professionalId, locationId: locationId || undefined, startsAt, notes: notes || undefined,
          title: activeType.fields.title ? title.trim() : undefined,
          services: services.map((s: any) => ({ serviceId: s.serviceId, name: s.name, durationMinutes: s.durationMinutes, price: s.price })) })
        onClose()
        onCreated?.(newBooking.id, externalSource)
      } else if (bookingId) {
        await updateBooking(bookingId, {
          clientId, professionalId, locationId: locationId || undefined, startsAt, notes: notes || undefined, status: status as any,
          title: activeType.fields.title ? title.trim() : undefined,
          services: services.map((s: any) => ({ serviceId: s.serviceId, name: s.name, durationMinutes: s.durationMinutes, price: s.price })),
        })
        if (status === 'cancelled' && config.cancellationDetails && cancellationReasonId) {
          await config.cancellationDetails.saveCancellationDetails({
            bookingId,
            reasonId: cancellationReasonId,
            notes: cancellationNotes.trim() || undefined,
            cancelledAt: new Date().toISOString(),
          })
        }
        onClose()
      }
    } catch { /* toast */ }
    setSaving(false)
  }

  async function handleDelete() {
    if (!bookingId) return
    setDeleting(true)
    try { await deleteBooking(bookingId); onClose() } catch { /* toast */ }
    setDeleting(false)
  }

  const isPaidBooking = editPaymentStatus === 'paid'
  const selectedCancellationReason = cancellationReasons.find((reason) => reason.id === cancellationReasonId)
  const needsCancellationReason = mode === 'edit' && status === 'cancelled' && !!config.cancellationDetails
  const needsCancellationNotes = needsCancellationReason && !!selectedCancellationReason?.requiresNotes

  // Dirty check — only enable Update when something changed
  const formSnapshot = useMemo(() =>
    JSON.stringify({ title, clientId, professionalId, locationId, date, startTime, status, notes, cancellationReasonId, cancellationNotes, services: services.map((s: any) => ({ id: s.serviceId, dur: s.durationMinutes, price: s.price })) }),
    [title, clientId, professionalId, locationId, date, startTime, status, notes, cancellationReasonId, cancellationNotes, services]
  )
  const isDirty = mode === 'create' || formSnapshot !== initialSnapshot.current

  const canSubmit = (
    (!activeType.fields.title || title.trim()) &&
    (!activeType.requiresClient || clientId) &&
    (!activeType.fields.professional || professionalId) &&
    (!activeType.requiresServices || services.length > 0) &&
    (!needsCancellationReason || !!cancellationReasonId) &&
    (!needsCancellationNotes || !!cancellationNotes.trim()) &&
    !conflict && !saving
  )

  const showTabs = config.bookingTypes.length > 1

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <ModalContent size="lg" noPadding>

        {/* ═══ TOP — type tabs + date/time ═══ */}
        <div className="px-5 pt-4 pb-3 shrink-0 space-y-3">
          <ModalTitle className="sr-only">
            {mode === 'create' ? t('agenda.appointment.new') : t('agenda.appointment.edit')}
          </ModalTitle>

          {/* Booking type tabs (create) or section tabs (edit) */}
          {showTabs && mode === 'create' ? (
            <div className="flex gap-1 border-b fayz-glass-divider">
              {config.bookingTypes.map((bt) => {
                const label = t(`agenda.bookingType.${bt.id}`) || bt.label
                const isActive = bookingType === bt.id
                const BtIcon = BOOKING_TYPE_ICONS[bt.icon] ?? Calendar
                return (
                  <button key={bt.id} type="button" onClick={() => setBookingType(bt.id)}
                    className={`relative flex items-center gap-1.5 pb-2 px-2 text-xs font-medium transition-colors ${
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    <BtIcon className="h-3.5 w-3.5" />
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : mode === 'edit' && (
            (config.clientEntityDef && clientId) || (config.modules.financial && editOrderId) ? (
              <div className="flex gap-1 border-b fayz-glass-divider">
                {([
                  { id: 'appointment' as const, label: t(`agenda.bookingType.${bookingType}`) || activeType.label, icon: Calendar, show: true },
                  { id: 'client' as const, label: t('agenda.appointment.clientTab'), icon: User, show: !!config.clientEntityDef && !!clientId },
                  { id: 'financial' as const, label: t('agenda.payment.title'), icon: DollarSign, show: config.modules.financial && !!editOrderId },
                ]).filter((tab) => tab.show).map((tab) => {
                  const isActive = modalTab === tab.id
                  return (
                    <button key={tab.id} type="button" onClick={() => setModalTab(tab.id)}
                      className={`relative flex items-center gap-1.5 pb-2 px-2 text-xs font-medium transition-colors ${
                        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}>
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.id === 'financial' && editPaymentStatus === 'paid' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      )}
                      {tab.id === 'financial' && editPaymentStatus !== 'paid' && (
                        (editPaymentStatus !== 'none' || (totalPrice > 0 && date <= new Date().toISOString().slice(0, 10)))
                      ) && (
                        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                      )}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <h2 className="text-sm font-semibold">
                {t(`agenda.bookingType.${bookingType}`) || activeType.label}
              </h2>
            )
          )}

          {/* Date/time + professional row — hidden on financial tab */}
          {modalTab === 'appointment' && (
            <>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
                  {editingDate ? (
                    <input type="date" value={date} autoFocus
                      onChange={(e) => { setDate(e.target.value); setEditingDate(false) }}
                      onBlur={() => setEditingDate(false)}
                      className="bg-transparent text-sm font-medium focus:outline-none border-b border-foreground w-auto shrink-0" />
                  ) : (
                    <button type="button" onClick={() => setEditingDate(true)}
                      className="px-0.5 py-0.5 font-medium border-b border-transparent hover:border-foreground transition-colors shrink-0">
                      {formatCompactDate(date, locale)}
                    </button>
                  )}
                  {editingTime ? (
                    <input type="time" value={startTime} autoFocus
                      onChange={(e) => { if (e.target.value) { setStartTime(e.target.value); setEditingTime(false) } }}
                      onBlur={() => setEditingTime(false)}
                      className="bg-transparent text-xs text-muted-foreground focus:outline-none border-b border-foreground w-auto shrink-0" />
                  ) : (
                    <button type="button" onClick={() => setEditingTime(true)}
                      className="px-0.5 py-0.5 text-xs text-muted-foreground border-b border-transparent hover:border-foreground transition-colors shrink-0">
                      {startTime}
                    </button>
                  )}
                  <span className="text-[11px] text-muted-foreground/60">—</span>
                  <span className="text-[11px] text-muted-foreground/60">{endTime}</span>

                  {/* Professional — right-aligned on the same row */}
                  {activeType.fields.professional && (
                    <div className="ml-auto shrink-0">
                      <ProfessionalSelect value={professionalId} onChange={setProfessionalId} professionals={professionals} />
                    </div>
                  )}
                </div>
              </div>

              {conflict && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {t('agenda.appointment.conflict')}
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ BODY ═══ */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Client tab content — reuses the same CrudDetailPage as /clients/:id */}
          {modalTab === 'client' && clientId && config.clientEntityDef && (
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {clientDataLoading ? (
                <div className="space-y-3 py-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : clientData ? (
                clientEditing ? (
                  <CrudFormPage
                    embedded
                    entityDef={config.clientEntityDef}
                    mode="edit"
                    initialData={clientData}
                    namePlural=""
                    onCancel={() => setClientEditing(false)}
                    onSubmit={async (data) => {
                      try {
                        const { getSupabaseClientOptional } = await import('@fayz-ai/core')
                        const supabase = getSupabaseClientOptional() as any
                        if (!supabase) return
                        const dbData: Record<string, unknown> = {}
                        for (const [k, v] of Object.entries(data)) {
                          dbData[k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())] = v
                        }
                        await supabase.from('people').update(dbData).eq('id', clientId)
                        setClientData({ ...clientData, ...data })
                        setClientEditing(false)
                      } catch { /* toast */ }
                    }}
                  />
                ) : (
                  <CrudDetailPage
                    embedded
                    entityDef={config.clientEntityDef}
                    item={clientData}
                    namePlural=""
                    basePath=""
                    onBack={() => setModalTab('appointment')}
                    onEdit={() => setClientEditing(true)}
                  />
                )
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('agenda.appointment.noClientData')}</p>
              )}
            </div>
          )}

          {/* Financial tab content */}
          {modalTab === 'financial' && editOrderId && config.financialBridge && (
            <div className="flex-1 overflow-y-auto">
              <BookingPaymentPanel
                orderId={editOrderId}
                orderTotal={editOrderTotal}
                services={services.map((s: any) => ({ name: s.name, price: s.price, durationMinutes: s.durationMinutes }))}
                formatCurrency={(v) => fmtCurrency(v, currency.locale, currency.code)}
                inline
                onClose={() => setModalTab('appointment')}
                onPaymentChange={() => {
                  config.financialBridge!.getPaymentDetail(editOrderId).then((d) => {
                    if (d) { setEditPaymentStatus(d.status); setEditOrderTotal(d.totalAmount) }
                  }).catch(() => {})
                  // Propagate to the calendar card + popover badge (booking.paymentStatus
                  // is ledger-derived) so they update without a page refresh.
                  if (agendaDateRange.start) fetchBookings(agendaDateRange)
                }}
              />
            </div>
          )}

          {/* Appointment tab content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ display: modalTab === 'appointment' ? undefined : 'none' }}>
          <div className="border-t fayz-glass-divider px-5 py-3 space-y-1 flex-1 overflow-y-auto">

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-2 py-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="h-4 w-4 rounded bg-muted animate-pulse shrink-0" />
                    <div className="h-8 flex-1 rounded-lg bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            {!loading && <>

            {/* Title — free-text event name (simple / Google-Calendar-style events) */}
            {activeType.fields.title && (
              <div className="flex items-center gap-3 py-1">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('agenda.appointment.addTitle')} autoFocus={mode === 'create'}
                  className="w-full flex-1 rounded-input border border-input bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}

            {/* Client */}
            {activeType.fields.client && (
              <div className="flex items-center gap-3 py-1">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  {clientId && !quickCreate ? (
                    <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-sm">
                      <PersonLink personId={clientId} name={clientSearch} size="default" className="flex-1 min-w-0" />
                      {clientPhone && <span className="text-[10px] text-muted-foreground shrink-0">{clientPhone}</span>}
                      {!isPaidBooking && (
                        <button type="button" onClick={() => { setClientId(''); setClientSearch(''); setClientPhone('') }}
                          className="p-0.5 text-muted-foreground hover:text-destructive shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : !quickCreate ? (
                    <>
                    <SearchCombobox
                      value={clientSearch}
                      onChange={(v) => { setClientSearch(v); setClientId('') }}
                      onSelect={selectClient}
                      options={clientOptions}
                      loading={clientSearching}
                      placeholder={t('agenda.appointment.searchClient')}
                      allowCreate
                      createLabel={t('agenda.appointment.newClient')}
                      onCreateNew={(name) => { setQuickCreate(true); setNewClientName(name); setNewClientPhone(''); setNewClientEmail('') }}
                      minimal
                      inlineLabel={t('agenda.appointment.addClient')}
                    />
                    {clientSearch.trim() && !clientSearching && (
                      <p className="mt-1 text-[11px] text-warning">
                        {t('agenda.appointment.selectClientHint')}
                      </p>
                    )}
                    </>
                  ) : (
                    <div className="rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)}
                          placeholder={t('agenda.appointment.name')} className="flex-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
                        <button type="button" onClick={() => setQuickCreate(false)}
                          className="p-1 text-muted-foreground hover:text-foreground shrink-0"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)}
                          placeholder={t('agenda.appointment.phone')} className="rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)}
                          placeholder={t('agenda.appointment.emailOptional')} className="rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <button type="button" disabled={creatingClient || !newClientName.trim()}
                        onClick={async () => {
                          setCreatingClient(true)
                          try {
                            const { getSupabaseClientOptional } = await import('@fayz-ai/core')
                            const { getAgendaTenantId } = await import('../lib/tenant')
                            const supabase = getSupabaseClientOptional() as any
                            const tenantId = getAgendaTenantId()
                            if (!supabase || !tenantId) throw new Error('Not initialized')

                            // 1. Insert into public.people (archetype base table)
                            const { data: personRow, error: personError } = await supabase.from('people').insert({
                              tenant_id: tenantId, kind: config.clientKind, name: newClientName.trim(),
                              phone: newClientPhone.trim() || null, email: newClientEmail.trim() || null,
                            }).select('id, name').single()
                            if (personError) throw personError

                            // 2. Insert into public.clients when the pool has that
                            // extension table (beauty-style projects). Pools without it
                            // (school, agency) live off public.people alone — a missing
                            // table is not an error; any other failure still rolls back.
                            const { error: clientError } = await supabase.from('clients').insert({
                              person_id: personRow.id, tenant_id: tenantId,
                            })
                            const missingExtensionTable = clientError?.code === 'PGRST205'
                              || clientError?.message?.includes('Could not find the table')
                            if (clientError && !missingExtensionTable) {
                              // Rollback person if extension insert fails
                              await supabase.from('people').delete().eq('id', personRow.id)
                              throw clientError
                            }

                            setClientId(personRow.id); setClientSearch(personRow.name); setQuickCreate(false)
                          } catch (err: any) {
                            const { toast } = await import('@fayz-ai/ui')
                            toast.error(t('agenda.appointment.createClientFailed'), { description: err?.message })
                          }
                          setCreatingClient(false)
                        }}
                        className="w-full rounded-md bg-primary border border-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-button-primary active:shadow-button-inset disabled:opacity-40 transition-colors">
                        {creatingClient ? t('agenda.appointment.creating') : t('agenda.appointment.create')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {activeType.fields.location && config.modules.locationSelection && (storeLocations.length > 0 || config.locations.length > 0) && (
              <div className="flex items-center gap-3 py-1">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <LocationSelect
                  value={locationId}
                  onChange={setLocationId}
                  locations={storeLocations.length > 0 ? storeLocations : config.locations}
                />
              </div>
            )}

            {/* Services */}
            {activeType.fields.services && (
              <div className="flex items-start gap-3 py-1">
                <Briefcase className="h-4 w-4 mt-1.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  {services.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {services.map((svc, idx) => (
                        <div key={idx} className="flex items-center rounded-md bg-muted/30 px-2.5 py-1.5 text-sm">
                          <span className="flex-1 truncate min-w-0">{svc.name}</span>
                          <div className="flex items-center gap-0.5 shrink-0 ml-3">
                            <InlineNumber
                              value={svc.durationMinutes}
                              onChange={(v) => setServices((p) => p.map((s, i) => i === idx ? { ...s, durationMinutes: Math.round(v) } : s))}
                              min={5}
                              step={5}
                              className="w-10 shrink-0"
                              disabled={isPaidBooking}
                              tooltip={t('agenda.appointment.duration')}
                            />
                            <span className="text-[11px] text-muted-foreground">min</span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 ml-3">
                            <span className="text-[11px] text-muted-foreground">{currency.symbol}</span>
                            <InlineNumber
                              value={svc.price}
                              onChange={(v) => setServices((p) => p.map((s, i) => i === idx ? { ...s, price: v } : s))}
                              min={0}
                              step={0.01}
                              className="w-14 shrink-0"
                              disabled={isPaidBooking}
                              tooltip={t('agenda.appointment.price')}
                            />
                          </div>
                          {!isPaidBooking && (
                            <button type="button" onClick={() => removeService(idx)} className="p-0.5 ml-2 text-muted-foreground hover:text-destructive shrink-0">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isPaidBooking && <SearchCombobox
                    value={serviceSearch}
                    onChange={setServiceSearch}
                    onSelect={addService}
                    options={serviceOptions}
                    placeholder={t('agenda.appointment.searchService')}
                    onBlurEmpty={() => {}}
                    onFocus={() => { if (!serviceSearch && serviceOptions.length === 0) setServiceOptions(initialServiceOptions) }}
                    renderRight={(opt) => {
                      const dur = (opt.data?.duration_minutes as number) || 0
                      const hasPrice = opt.price != null
                      if (!hasPrice && !dur) return null
                      return (
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {hasPrice && fmtCurrency(opt.price!, currency.locale, currency.code)}
                          {hasPrice && dur > 0 && ' · '}
                          {dur > 0 && `${dur}min`}
                        </span>
                      )
                    }}
                    minimal
                    inlineLabel={services.length > 0 ? t('agenda.appointment.addService') : t('agenda.appointment.addServiceFirst')}
                    inlineIcon={services.length > 0 ? 'plus' : 'search'}
                  />}
                </div>
              </div>
            )}

            {/* Status */}
            {activeType.fields.status && (
              <div className="flex items-center gap-3 py-1">
                <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                <StatusSelect value={status} onChange={setStatus} statuses={config.statuses} bookingDate={date} />
              </div>
            )}

            {needsCancellationReason && (
              <div className="flex items-start gap-3 py-1">
                <Ban className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
                <div className="flex-1 space-y-2">
                  <select
                    value={cancellationReasonId}
                    onChange={(event) => setCancellationReasonId(event.target.value)}
                    disabled={cancellationReasonsLoading}
                    className="w-full rounded-input border border-input bg-card px-2.5 py-1.5 text-sm shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">{cancellationReasonsLoading ? t('agenda.cancellation.loadingReasons') : t('agenda.cancellation.selectReason')}</option>
                    {cancellationReasons.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.label}{reason.requiresNotes ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={cancellationNotes}
                    onChange={(event) => setCancellationNotes(event.target.value)}
                    placeholder={needsCancellationNotes ? t('agenda.cancellation.notesRequired') : t('agenda.cancellation.notesOptional')}
                    rows={2}
                    className="w-full rounded-input border border-input bg-card px-2.5 py-1.5 text-sm resize-none shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Notes — progressive disclosure */}
            {!showNotes ? (
              <div className="flex items-center gap-3 py-1">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <button type="button" onClick={() => setShowNotes(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left py-1.5 pl-2">
                  {t('agenda.appointment.addNotes')}
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-3 py-1">
                <FileText className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('agenda.appointment.addDescription')} rows={2} autoFocus
                  className="w-full flex-1 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}

            </>}
          </div>

          {/* Appointment footer — inside form for submit */}
          {modalTab === 'appointment' && !clientEditing && (
            <div className="px-5 py-2.5 border-t fayz-glass-divider bg-transparent shrink-0 sm:rounded-b-2xl">
              {confirmingDelete ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-destructive font-medium">{t('agenda.appointment.deleteConfirm')}</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                      {t('agenda.appointment.cancel')}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                      {deleting ? t('agenda.appointment.deleting') : t('agenda.appointment.confirmDelete')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mode === 'edit' && (
                      <button type="button" onClick={() => setConfirmingDelete(true)} className="text-xs text-destructive font-medium hover:underline">{t('agenda.appointment.delete')}</button>
                    )}
                    {services.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {totalDuration}min
                        {config.modules.financial && totalPrice > 0 && mode === 'edit' ? (
                          paymentStatusLoading ? (
                            <span className="h-4 w-16 rounded-full bg-muted animate-pulse" />
                          ) : isPaidBooking ? (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setModalTab('financial') }}
                              className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success hover:bg-success/20 transition-colors">
                              <Check className="h-2.5 w-2.5" />
                              {fmtCurrency(totalPrice, currency.locale, currency.code)} &middot; {t('agenda.payment.paid')}
                            </button>
                          ) : date <= new Date().toISOString().slice(0, 10) ? (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setModalTab('financial') }}
                              className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning hover:bg-warning/20 transition-colors">
                              <HandCoins className="h-3 w-3" />
                              {fmtCurrency(totalPrice, currency.locale, currency.code)} &middot; {t('agenda.payment.collect')}
                            </button>
                          ) : (
                            <span>&middot; {fmtCurrency(totalPrice, currency.locale, currency.code)}</span>
                          )
                        ) : (
                          <span>&middot; {fmtCurrency(totalPrice, currency.locale, currency.code)}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} className="hidden sm:inline-flex">
                      {t('agenda.appointment.cancel')}
                    </Button>
                    <Button type="submit" variant="default" size="sm" disabled={!canSubmit || !isDirty}>
                      {saving ? t('agenda.appointment.saving') : mode === 'create' ? t('agenda.appointment.save') : t('agenda.appointment.update')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

          {/* Non-appointment tab footer — outside form */}
          {modalTab !== 'appointment' && !clientEditing && (
            <div className="px-5 py-2.5 border-t fayz-glass-divider bg-transparent shrink-0 sm:rounded-b-2xl">
              <div className="flex items-center">
                <button type="button" onClick={() => { setModalTab('appointment'); setClientEditing(false) }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('agenda.payment.backToAppointment')}
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalContent>

    </Modal>
  )
}
