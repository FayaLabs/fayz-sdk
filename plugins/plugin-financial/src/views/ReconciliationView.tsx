import React, { useEffect, useState, useCallback } from 'react'
import { Landmark, RefreshCw, Check, Link2, Sparkles, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Button, toast } from '@fayz-ai/ui'
import { useFinancialConfig, useFinancialProvider, formatCurrency } from '../FinancialContext'
import { useTranslation } from '@fayz-ai/core'
import type { FinancialMovement, ReconciliationCandidate } from '../types'

// ---------------------------------------------------------------------------
// Reconciliation (conciliação) — match imported bank lines to internal movements
//
// Imported bank-statement lines live in financial_movements tagged with an
// externalSource. This screen lets the operator link each pending line to the
// internal movement it settles (suggested by amount + date proximity), or
// accept it standalone. Reusable across apps — fed by any bank connector that
// imports through the financial provider's reconciliation methods.
// ---------------------------------------------------------------------------

export function ReconciliationView() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const provider = useFinancialProvider()
  const fmt = (n: number) => formatCurrency(n, currency)

  const [lines, setLines] = useState<FinancialMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ReconciliationCandidate[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const supported = typeof provider.getUnreconciled === 'function'

  const load = useCallback(async () => {
    if (!provider.getUnreconciled) return
    setLoading(true)
    try {
      const data = await provider.getUnreconciled()
      setLines(data)
      // Keep the selection valid; otherwise drop the right panel.
      setSelectedId((prev) => (prev && data.some((l) => l.id === prev) ? prev : null))
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => { void load() }, [load])

  // Load suggestions whenever the selected line changes.
  useEffect(() => {
    if (!selectedId || !provider.suggestReconciliation) { setCandidates([]); return }
    let cancelled = false
    setCandidatesLoading(true)
    provider.suggestReconciliation(selectedId)
      .then((c) => { if (!cancelled) setCandidates(c) })
      .finally(() => { if (!cancelled) setCandidatesLoading(false) })
    return () => { cancelled = true }
  }, [selectedId, provider])

  async function match(bankMovementId: string, matchedMovementId?: string) {
    if (!provider.reconcileMovement) return
    setBusy(true)
    try {
      await provider.reconcileMovement({ bankMovementId, matchedMovementId })
      toast.success(t('financial.reconciliation.match'))
      await load()
    } catch {
      toast.error(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return (
      <div className="py-16 text-center">
        <Landmark className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t('financial.reconciliation.empty')}</p>
      </div>
    )
  }

  const selected = lines.find((l) => l.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('financial.reconciliation.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('financial.reconciliation.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {lines.length > 0
              ? t('financial.reconciliation.pending', { count: lines.length })
              : t('financial.reconciliation.allDone')}
          </span>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || busy}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('financial.reconciliation.refresh')}
          </Button>
        </div>
      </div>

      {lines.length === 0 && !loading ? (
        <div className="rounded-lg border bg-card shadow-sm py-16 text-center">
          <Check className="h-8 w-8 text-success/40 mx-auto mb-2" />
          <p className="text-sm font-medium">{t('financial.reconciliation.empty')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('financial.reconciliation.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left — pending bank lines */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{t('financial.reconciliation.bankLines')}</h3>
            </div>
            <div className="divide-y max-h-[60vh] overflow-auto">
              {lines.map((line) => {
                const isCredit = line.direction === 'credit'
                return (
                  <button
                    key={line.id}
                    onClick={() => setSelectedId(line.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors ${
                      selectedId === line.id ? 'bg-muted/50' : ''
                    }`}
                  >
                    {isCredit
                      ? <ArrowDownCircle className="h-4 w-4 text-success shrink-0" />
                      : <ArrowUpCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{line.notes || line.externalId}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {line.paymentDate ?? line.dueDate}
                        {line.externalSource && <span className="ml-1 uppercase tracking-wide">· {line.externalSource}</span>}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${isCredit ? 'text-success' : 'text-destructive'}`}>
                      {fmt(line.amount)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right — suggested matches for the selected line */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{t('financial.reconciliation.candidates')}</h3>
            </div>

            {!selected ? (
              <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                {t('financial.reconciliation.selectLine')}
              </p>
            ) : (
              <div className="p-3 space-y-2">
                {candidatesLoading ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">…</div>
                ) : (
                  <>
                    {candidates.map((c) => (
                      <div key={c.movement.id} className="flex items-center gap-3 rounded-md border p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">
                            {c.invoice?.contactName || c.movement.notes || c.invoice?.fiscalNumber || t('financial.reconciliation.match')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.movement.dueDate}
                            <span className="ml-1.5 inline-flex items-center rounded px-1 py-px bg-primary/10 text-primary font-medium">
                              {t('financial.reconciliation.matchScore', { score: Math.round(c.score * 100) })}
                            </span>
                          </p>
                        </div>
                        <span className="text-sm font-semibold shrink-0">{fmt(c.movement.amount)}</span>
                        <Button size="sm" disabled={busy} onClick={() => match(selected.id, c.movement.id)}>
                          <Link2 className="h-3.5 w-3.5" />
                          {t('financial.reconciliation.match')}
                        </Button>
                      </div>
                    ))}
                    {candidates.length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        {t('financial.reconciliation.noCandidates')}
                      </p>
                    )}

                    {/* Accept the line standalone (no internal counterpart) */}
                    <div className="pt-2 mt-1 border-t">
                      <Button variant="outline" size="sm" className="w-full" disabled={busy} onClick={() => match(selected.id)}>
                        <Check className="h-3.5 w-3.5" />
                        {t('financial.reconciliation.accept')}
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center mt-1">
                        {t('financial.reconciliation.acceptHint')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
