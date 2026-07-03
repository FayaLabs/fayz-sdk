import React, { useState, useRef, useEffect } from 'react'
import { X, Pencil, Trash2, Clock, MapPin, User, FileText, DollarSign, Check, AlertTriangle, HandCoins } from 'lucide-react'
import { PersonLink } from '@fayz-ai/saas'
import { FloatingPanel, type FloatingPanelRef } from './FloatingPanel'
import { useAgendaConfig, useAgendaStore } from '../AgendaContext'
import { useTranslation } from '@fayz-ai/core'
import { isStatusAvailable } from '../types'
import type { CalendarBooking } from '../types'

interface Props {
  booking: CalendarBooking
  position: { x: number; y: number }
  onClose: () => void
  onEdit: (id: string) => void
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}
function fmtCurrency(amount: number, locale: string, code: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount)
}

// Inline status select for the popover
function PopoverStatusSelect({ value, statuses, bookingStartsAt, onChange }: {
  value: string; statuses: Array<{ value: string; label: string; color: string; availableWhen?: string }>
  bookingStartsAt: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = statuses.find((s) => s.value === value)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
        style={{ backgroundColor: (current?.color ?? '#6b7280') + '18', color: current?.color ?? '#6b7280' }}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: current?.color }} />
        {current?.label ?? value}
        <svg className="h-3 w-3 opacity-50" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="fayz-glass-surface absolute bottom-full left-0 z-50 mb-1 rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100 min-w-[140px]">
          {statuses.map((s) => {
            const available = isStatusAvailable(s as any, bookingStartsAt)
            return (
            <button key={s.value} type="button" disabled={!available}
              onClick={() => { if (available) { onChange(s.value); setOpen(false) } }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                !available ? 'opacity-30 cursor-not-allowed' : s.value === value ? 'bg-muted/30' : 'hover:bg-muted/50'
              }`}>
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AppointmentPopover({ booking, position, onClose, onEdit }: Props) {
  const t = useTranslation()
  const config = useAgendaConfig()
  const deleteBooking = useAgendaStore((s) => s.deleteBooking)
  const updateStatus = useAgendaStore((s) => s.updateBookingStatus)
  const openModal = useAgendaStore((s) => s.openAppointmentModal)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const statusConfig = config.statuses.find((s) => s.value === booking.status)
  const color = statusConfig?.color ?? '#6b7280'
  const timeRange = `${fmtTime(booking.startsAt)}${booking.endsAt ? ' – ' + fmtTime(booking.endsAt) : ''}`

  async function handleDelete() {
    setDeleting(true)
    try { await deleteBooking(booking.id); onClose() } catch { setDeleting(false) }
  }

  return (
    <>
    <FloatingPanel position={position} width={320} height={340} onClose={onClose}>
      {(panel) => (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-end gap-0.5 px-3 pt-3 pb-1">
            {confirmingDelete ? (
              <>
                <span className="text-xs text-destructive font-medium mr-auto pl-1">{t('agenda.appointment.deleteConfirm')}</span>
                <button onClick={() => setConfirmingDelete(false)}
                  className="rounded px-2 py-0.5 text-[11px] font-medium hover:bg-muted/50 transition-colors">{t('agenda.appointment.cancel')}</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="rounded bg-destructive border border-destructive px-2 py-0.5 text-[11px] font-medium text-destructive-foreground hover:bg-destructive/90 shadow-button-primary active:shadow-button-inset disabled:opacity-40 transition-colors">{deleting ? t('agenda.appointment.deleting') : t('agenda.appointment.confirmDelete')}</button>
              </>
            ) : (
              <>
                <button onClick={() => panel.expandThen(() => onEdit(booking.id))}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors" title={t('common.edit')}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={() => setConfirmingDelete(true)}
                  className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors" title={t('common.delete')}>
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
                <button onClick={panel.dismiss} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pb-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-3 w-3 rounded shrink-0" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                {/* Client agendas link to the person; simple events (no client
                    capability) render the free-text title as a plain heading —
                    booking.clientName carries the event title in that model. */}
                {config.capabilities.client ? (
                  <PersonLink personId={booking.clientId} name={booking.clientName ?? 'Unknown'} className="text-base" />
                ) : (
                  <p className="text-base font-medium truncate">{booking.clientName || t('agenda.appointment.untitled')}</p>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">{fmtDate(booking.startsAt)} &middot; {timeRange}</p>
              </div>
            </div>

            {booking.services && booking.services.length > 0 && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="text-sm space-y-0.5">
                  {booking.services.map((svc) => (
                    <p key={svc.id}>{svc.name} <span className="text-muted-foreground">({svc.durationMinutes}min)</span></p>
                  ))}
                </div>
              </div>
            )}

            {config.capabilities.professional && booking.professionalName && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{booking.professionalName}</span>
              </div>
            )}

            {booking.locationName && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{booking.locationName}</span>
              </div>
            )}

            {booking.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">{booking.notes}</p>
              </div>
            )}

            {booking.orderTotal != null && booking.orderTotal > 0 && (() => {
              const total = fmtCurrency(booking.orderTotal, config.currency.locale, config.currency.code)
              const ps = booking.paymentStatus ?? 'none'
              const hasFinancial = config.modules.financial && booking.orderId

              // No financial module — just show total
              if (!hasFinancial) {
                return (
                  <div className="pt-2 border-t fayz-glass-divider flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('agenda.appointment.total')}</span>
                    <span className="font-medium">{total}</span>
                  </div>
                )
              }

              const badgeConfig: Record<string, { icon: React.ElementType; bg: string; text: string; label: string }> = {
                none: { icon: HandCoins, bg: 'bg-warning/10 hover:bg-warning/15', text: 'text-warning', label: `${total} · ${t('agenda.payment.collect')}` },
                pending: { icon: Clock, bg: 'bg-warning/10 hover:bg-warning/15', text: 'text-warning', label: `${total} · ${t('agenda.payment.pending')}` },
                partial: { icon: DollarSign, bg: 'bg-warning/10 hover:bg-warning/15', text: 'text-warning', label: `${total} · ${t('agenda.payment.partial')}` },
                paid: { icon: Check, bg: 'bg-success/10 hover:bg-success/15', text: 'text-success', label: `${total} · ${t('agenda.payment.paid')}` },
                overdue: { icon: AlertTriangle, bg: 'bg-destructive/10 hover:bg-destructive/15', text: 'text-destructive', label: `${total} · ${t('agenda.payment.overdue')}` },
                cancelled: { icon: X, bg: 'bg-muted hover:bg-muted/80', text: 'text-muted-foreground', label: `${total} · ${t('agenda.payment.cancelled')}` },
              }
              const cfg = badgeConfig[ps] ?? badgeConfig.none
              const StatusIcon = cfg.icon

              return (
                <div className="pt-2 border-t fayz-glass-divider flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('agenda.appointment.total')}</span>
                  <button
                    type="button"
                    onClick={() => { onClose(); openModal('edit', { bookingId: booking.id, initialTab: 'financial' }) }}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${cfg.bg} ${cfg.text}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </button>
                </div>
              )
            })()}

            {/* Status workflow — hidden for simple events (no status capability). */}
            {config.capabilities.status && (
              <div className="pt-2 border-t fayz-glass-divider">
                <PopoverStatusSelect
                  value={booking.status}
                  statuses={config.statuses}
                  bookingStartsAt={booking.startsAt}
                  onChange={(v) => { updateStatus(booking.id, v); onClose() }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </FloatingPanel>
    </>
  )
}
