import React, { useEffect } from 'react'
import { CheckCircle, Phone, MessageCircle, XCircle, Clock } from 'lucide-react'
import { useAgendaConfig, useAgendaStore } from '../AgendaContext'
import { useTranslation } from '@fayz-ai/core'
import type { CalendarBooking, ConfirmationRecord } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  })
}

function getConfirmationStatus(booking: CalendarBooking): string {
  const confirmations = booking.metadata?.confirmations as ConfirmationRecord[] | undefined
  if (!confirmations?.length) return 'pending'
  const last = confirmations[confirmations.length - 1]
  return last.status
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmationsView() {
  const t = useTranslation()
  const config = useAgendaConfig()
  const confirmations = useAgendaStore((s) => s.pendingConfirmations)
  const loading = useAgendaStore((s) => s.confirmationsLoading)
  const fetchConfirmations = useAgendaStore((s) => s.fetchConfirmations)
  const updateStatus = useAgendaStore((s) => s.updateBookingStatus)

  useEffect(() => { fetchConfirmations() }, [])

  const confirmedCount = confirmations.filter((b) => b.status === 'confirmed').length
  const totalCount = confirmations.length
  const confirmRate = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{config.labels.confirmations}</h2>
            <p className="text-sm text-muted-foreground">{t('agenda.confirmations.subtitle')}</p>
          </div>
        </div>

        {/* Confirmation rate */}
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-sm text-muted-foreground">{t('agenda.confirmations.confirmed')}</span>
          <span className="text-lg font-semibold text-primary">{confirmRate}%</span>
          <span className="text-xs text-muted-foreground">({confirmedCount}/{totalCount})</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">{t('agenda.confirmations.loading')}</div>
      ) : confirmations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{t('agenda.confirmations.empty')}</p>
          <p className="text-sm text-muted-foreground/70">{t('agenda.confirmations.emptySubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {confirmations.map((booking) => {
            const confStatus = getConfirmationStatus(booking)
            const services = booking.services?.map((s) => s.name).join(', ') ?? '-'

            return (
              <div key={booking.id} className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors">
                {/* Status indicator */}
                <div className={`h-2 w-2 rounded-full shrink-0 ${
                  confStatus === 'confirmed' ? 'bg-success' :
                  confStatus === 'sent' ? 'bg-info' :
                  confStatus === 'declined' ? 'bg-destructive' :
                  'bg-warning'
                }`} />

                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{booking.clientName ?? t('agenda.confirmations.unknownClient')}</p>
                  <p className="text-sm text-muted-foreground truncate">{services}</p>
                </div>

                {/* Date/time */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">{formatDate(booking.startsAt)}</p>
                  <p className="text-sm text-muted-foreground">{formatTime(booking.startsAt)}</p>
                </div>

                {/* Professional */}
                <div className="w-28 shrink-0 text-right">
                  <p className="text-sm truncate">{booking.professionalName}</p>
                </div>

                {/* Phone */}
                <div className="w-32 shrink-0">
                  <p className="text-sm text-muted-foreground">{booking.clientPhone ?? '-'}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {config.confirmationChannels.some((c) => c.id === 'whatsapp') && (
                    <button
                      className="p-1.5 rounded hover:bg-muted"
                      title={t('agenda.confirmations.sendWhatsApp')}
                    >
                      <MessageCircle className="h-4 w-4 text-success" />
                    </button>
                  )}
                  <button
                    className="p-1.5 rounded hover:bg-muted"
                    title={t('agenda.confirmations.call')}
                  >
                    <Phone className="h-4 w-4 text-info" />
                  </button>
                  <button
                    onClick={() => updateStatus(booking.id, 'confirmed')}
                    className="p-1.5 rounded hover:bg-muted"
                    title={t('agenda.confirmations.markConfirmed')}
                  >
                    <CheckCircle className="h-4 w-4 text-success" />
                  </button>
                  <button
                    onClick={() => updateStatus(booking.id, 'cancelled')}
                    className="p-1.5 rounded hover:bg-muted"
                    title={t('agenda.confirmations.markCancelled')}
                  >
                    <XCircle className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
