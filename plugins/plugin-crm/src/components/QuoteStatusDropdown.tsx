import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Loader2, Send, CircleDashed, CircleCheckBig, CircleAlert, Ban } from 'lucide-react'
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator } from '@fayz-ai/ui'
import { ConfirmDialog } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { useCrmStore } from '../CrmContext'
import type { Quote, QuoteStatus } from '../types'

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<QuoteStatus, { bg: string; dot: string; icon: React.ElementType; label: string }> = {
  draft: { bg: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground', icon: CircleDashed, label: 'Draft' },
  sent: { bg: 'bg-info-soft text-info-soft-foreground', dot: 'bg-info', icon: Send, label: 'Sent' },
  approved: { bg: 'bg-success-soft text-success-soft-foreground', dot: 'bg-success', icon: CircleCheckBig, label: 'Approved' },
  rejected: { bg: 'bg-destructive-soft text-destructive-soft-foreground', dot: 'bg-destructive', icon: Ban, label: 'Rejected' },
  expired: { bg: 'bg-warning-soft text-warning-soft-foreground', dot: 'bg-warning', icon: CircleAlert, label: 'Expired' },
}

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent', 'expired'],
  sent: ['approved', 'rejected', 'expired'],
  approved: [],
  rejected: [],
  expired: [],
}

// ---------------------------------------------------------------------------
// Rejection reason modal
// ---------------------------------------------------------------------------

function RejectModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-modal border bg-card shadow-lg mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'saas-sheet-fade-in 150ms ease-out' }}
      >
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Reject Quote</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Provide a reason for the rejection.</p>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for rejection..."
          autoFocus
          className="w-full rounded-input border border-input bg-card px-3 py-2 text-sm shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
            Reject Quote
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ---------------------------------------------------------------------------
// QuoteStatusDropdown
// ---------------------------------------------------------------------------

export function QuoteStatusDropdown({ quote, onStatusChange, size = 'default' }: {
  quote: Quote
  onStatusChange?: (q: Quote) => void
  size?: 'sm' | 'default'
}) {
  const sendQuote = useCrmStore((s) => s.sendQuote)
  const approveQuote = useCrmStore((s) => s.approveQuote)
  const rejectQuote = useCrmStore((s) => s.rejectQuote)
  const expireQuote = useCrmStore((s) => s.expireQuote)

  const [loading, setLoading] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)

  const config = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft
  const StatusIcon = config.icon
  const transitions = TRANSITIONS[quote.status] ?? []

  async function handleTransition(target: QuoteStatus) {
    if (loading) return
    setLoading(true)
    try {
      let updated: Quote
      switch (target) {
        case 'sent':
          updated = await sendQuote(quote.id)
          break
        case 'approved':
          setShowApprove(true)
          setLoading(false)
          return
        case 'expired':
          updated = await expireQuote(quote.id)
          break
        default:
          setLoading(false)
          return
      }
      onStatusChange?.(updated)
    } catch {
      // toast handled by store
    } finally {
      setLoading(false)
    }
  }

  async function handleReject(reason: string) {
    setShowReject(false)
    setLoading(true)
    try {
      const updated = await rejectQuote(quote.id, reason)
      onStatusChange?.(updated)
    } catch {
      // toast handled by store
    } finally {
      setLoading(false)
    }
  }

  const isSmall = size === 'sm'

  // Terminal states — static badge, no dropdown
  if (transitions.length === 0) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-medium capitalize ${config.bg} ${isSmall ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[11px]'}`}>
        {!isSmall && <StatusIcon className="h-3 w-3" />}
        {config.label}
      </span>
    )
  }

  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            disabled={loading}
            className={`inline-flex items-center gap-1 rounded-full font-medium capitalize transition-all ${config.bg} ${
              isSmall ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[11px]'
            } hover:ring-2 hover:ring-primary/20 focus:outline-none focus:ring-2 focus:ring-ring`}
          >
            {!isSmall && <StatusIcon className="h-3 w-3" />}
            {config.label}
            {loading ? (
              <Loader2 className={`animate-spin ${isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
            ) : (
              <ChevronDown className={`opacity-50 ${isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />
            )}
          </button>
        </DropdownTrigger>
        <DropdownContent align="end" sideOffset={4} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DropdownLabel>Change status</DropdownLabel>
          <DropdownSeparator />
          {transitions.map((target) => {
            const t = STATUS_CONFIG[target]
            const TargetIcon = t.icon
            return (
              <DropdownItem
                key={target}
                onClick={() => target === 'rejected' ? setShowReject(true) : handleTransition(target)}
                className="gap-2.5"
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${t.dot}`} />
                <TargetIcon className="h-3.5 w-3.5 shrink-0" />
                <span>{t.label}</span>
              </DropdownItem>
            )
          })}
        </DropdownContent>
      </Dropdown>

      <ConfirmDialog
        open={showApprove}
        variant="success"
        title="Approve this quote?"
        description="This will create an invoice and convert the lead to a client. This action cannot be undone."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        loading={loading}
        onConfirm={async () => {
          setLoading(true)
          try {
            const updated = await approveQuote(quote.id)
            setShowApprove(false)
            onStatusChange?.(updated)
          } catch {
            // toast handled by store
          } finally {
            setLoading(false)
          }
        }}
        onCancel={() => setShowApprove(false)}
      />

      {showReject && (
        <RejectModal onConfirm={handleReject} onCancel={() => setShowReject(false)} />
      )}
    </>
  )
}
