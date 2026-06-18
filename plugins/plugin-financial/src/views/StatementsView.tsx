import React, { useEffect, useState, useMemo } from 'react'
import { Receipt, ArrowRightLeft, CheckCheck, Landmark } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, SubpageHeader, DatePicker, Button, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@fayz-ai/ui'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { useTranslation } from '@fayz-ai/core'
import { PersonLink } from '@fayz-ai/saas'
import type { StatementEntry } from '../types'
import { TransferModal } from '../components/TransferModal'

const ALL = 'all'

// Soft reconciliation marker for an extract row — a muted glyph with a hover
// tooltip explaining what it means. Rendered only when the movement carries the
// relevant state (reconciledAt / externalSource).
function ReconcileMarker({ kind, label }: { kind: 'reconciled' | 'imported'; label: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0 cursor-default">
            {kind === 'reconciled'
              ? <CheckCheck className="h-3 w-3 text-success/70" />
              : <Landmark className="h-3 w-3 text-muted-foreground/40" />}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Reference to the internal transaction a reconciled bank line was matched to —
// a small "⇄ {ref}" chip, clickable when the counterpart has an invoice to open.
function ReconciledWithRef({ refLabel, tooltip, onOpen }: { refLabel: string; tooltip: string; onOpen?: () => void }) {
  const inner = (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground max-w-[160px]">
      <ArrowRightLeft className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{refLabel}</span>
    </span>
  )
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {onOpen
            ? <button onClick={onOpen} className="hover:text-primary transition-colors">{inner}</button>
            : <span className="cursor-default">{inner}</span>}
        </TooltipTrigger>
        <TooltipContent className="text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function StatementsView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const statement = useFinancialStore((s) => s.statement)
  const statementLoading = useFinancialStore((s) => s.statementLoading)
  const paymentMethods = useFinancialStore((s) => s.paymentMethods)
  const paymentMethodTypes = useFinancialStore((s) => s.paymentMethodTypes)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  const fetchPaymentMethods = useFinancialStore((s) => s.fetchPaymentMethods)
  const fetchStatement = useFinancialStore((s) => s.fetchStatement)

  const [accountId, setAccountId] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [showTransfer, setShowTransfer] = useState(false)

  useEffect(() => { fetchBankAccounts(); fetchPaymentMethods() }, [])

  // Resolve a human payment-method label for a movement (method → type → card brand).
  const methodName = useMemo(() => {
    const byId = new Map(paymentMethods.map((m) => [m.id, m.name]))
    const typeById = new Map(paymentMethodTypes.map((tp) => [tp.id, tp.name]))
    return (mov: StatementEntry['movement']): string => {
      if (mov.paymentMethodId && byId.has(mov.paymentMethodId)) return byId.get(mov.paymentMethodId)!
      if (mov.paymentMethodTypeId && typeById.has(mov.paymentMethodTypeId)) return typeById.get(mov.paymentMethodTypeId)!
      if (mov.cardBrand) return mov.cardBrand
      return '—'
    }
  }, [paymentMethods, paymentMethodTypes])

  // Open the linked invoice (receivable/payable detail) for a statement row.
  function openInvoice(e: StatementEntry) {
    if (!onNavigate || !e.movement.invoiceId) return
    const base = e.movement.direction === 'credit' ? 'receivables' : 'payables'
    onNavigate(`${base}-detail:${e.movement.invoiceId}`)
  }

  useEffect(() => {
    if (accountId) {
      fetchStatement({
        bankAccountId: accountId === ALL ? undefined : accountId,
        dateRange: { from: dateFrom, to: dateTo },
      })
    }
  }, [accountId, dateFrom, dateTo])

  // Default to the consolidated "All accounts" view so paid invoices show up even
  // when payments weren't tied to a specific bank account.
  useEffect(() => {
    if (!accountId) setAccountId(ALL)
  }, [])

  const fmt = (n: number) => formatCurrency(n, currency)

  const columns: ColumnDef<StatementEntry, any>[] = useMemo(() => [
    {
      id: 'date', header: t('financial.statements.columnDate'),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.movement.paymentDate ?? row.original.movement.dueDate}</span>
      ),
    },
    {
      id: 'description', header: t('financial.statements.columnDescription'),
      cell: ({ row }) => {
        const e = row.original
        const isTransfer = e.entryKind !== 'movement'
        const memo = e.movement.notes
        const title = e.invoice?.contactName
          || (isTransfer ? t('financial.statements.transfer') : (memo || 'Transaction'))
        // Show the memo on its own line unless it's already serving as the title.
        const memoLine = memo && memo !== title ? memo : undefined
        const doc = e.invoice?.fiscalNumber
        const inst = e.movement.installmentNumber
        const canOpen = !!onNavigate && !!e.movement.invoiceId
        return (
          <div>
            <div className="flex items-center gap-1.5">
              {/* Person name → hovercard with contact details (plain text when no contact) */}
              <PersonLink personId={e.invoice?.contactId} name={title} size="sm" />
              {/* Document reference → opens the linked invoice */}
              {doc && (canOpen ? (
                <button
                  onClick={() => openInvoice(e)}
                  className="text-[10px] text-muted-foreground font-mono hover:text-primary hover:underline"
                  title={t('financial.statements.viewInvoice')}
                >
                  {doc}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground font-mono">{doc}</span>
              ))}
              {isTransfer && (
                <span className="text-[9px] uppercase tracking-wide px-1 py-px rounded bg-warning/15 text-warning font-semibold">
                  {t('financial.statements.transfer')}
                </span>
              )}
              {/* Soft reconciliation marker — optional, driven by what the plugin exposes:
                  reconciledAt = matched/accepted (conciliado); externalSource = imported from a
                  bank sync but not yet reconciled. Hover shows what it means. */}
              {e.movement.reconciledAt ? (
                <ReconcileMarker kind="reconciled" label={t('financial.statements.reconciled')} />
              ) : e.movement.externalSource ? (
                <ReconcileMarker kind="imported" label={t('financial.statements.imported')} />
              ) : null}
              {/* The transaction this bank line was conciliated with — link/id. */}
              {e.reconciledWith && (() => {
                const rw = e.reconciledWith
                const refLabel = rw.fiscalNumber || rw.contactName || rw.description || rw.movementId.slice(0, 8)
                const base = e.movement.direction === 'credit' ? 'receivables' : 'payables'
                const onOpen = onNavigate && rw.invoiceId ? () => onNavigate(`${base}-detail:${rw.invoiceId}`) : undefined
                return (
                  <ReconciledWithRef
                    refLabel={refLabel}
                    tooltip={t('financial.statements.reconciledWith', { ref: refLabel })}
                    onOpen={onOpen}
                  />
                )
              })()}
            </div>
            {memoLine && <p className="text-[11px] text-foreground/80">{memoLine}</p>}
            <p className="text-[10px] text-muted-foreground">
              <span className="capitalize">
                {isTransfer && e.counterAccountName
                  ? (e.entryKind === 'transfer-in' ? `← ${e.counterAccountName}` : `→ ${e.counterAccountName}`)
                  : e.movement.movementKind}
              </span>
              {inst ? ` · ${t('financial.statements.installmentShort', { n: inst })}` : ''}
            </p>
          </div>
        )
      },
    },
    {
      id: 'method', header: t('financial.statements.columnMethod'),
      cell: ({ row }) => {
        const mov = row.original.movement
        const name = methodName(mov)
        return (
          <div>
            <p className="text-xs">{name}</p>
            {mov.cardInstallments && mov.cardInstallments > 1 && (
              <p className="text-[10px] text-muted-foreground">{mov.cardInstallments}x</p>
            )}
          </div>
        )
      },
    },
    {
      id: 'debit', header: t('financial.statements.columnDebit'),
      cell: ({ row }) => (
        <span className="text-right block text-destructive text-xs">
          {row.original.movement.direction === 'debit' ? fmt(row.original.net) : ''}
        </span>
      ),
    },
    {
      id: 'credit', header: t('financial.statements.columnCredit'),
      cell: ({ row }) => {
        const e = row.original
        if (e.movement.direction !== 'credit') return <span className="block text-right" />
        return (
          <div className="text-right">
            <span className="block text-success text-xs">{fmt(e.net)}</span>
            {e.fee > 0 && (
              <span className="block text-[10px] text-muted-foreground">{fmt(e.gross)} − {fmt(e.fee)}</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'fee', header: t('financial.statements.columnFee'),
      cell: ({ row }) => (
        <span className="text-right block text-warning text-xs">
          {row.original.fee > 0 ? fmt(row.original.fee) : ''}
        </span>
      ),
    },
    {
      id: 'balance', header: t('financial.statements.columnBalance'),
      cell: ({ row }) => (
        <span className="text-right block font-medium text-xs">{fmt(row.original.runningBalance)}</span>
      ),
    },
  ], [currency, t, methodName, onNavigate])

  const entries = statement?.entries ?? []

  return (
    <div className="space-y-4">
      <SubpageHeader
        title={t('financial.statements.title')}
        subtitle={t('financial.statements.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)} disabled={bankAccounts.length < 2}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {t('financial.statements.newTransfer')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 max-w-xs">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">{t('financial.statements.account')}</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full mt-0.5 rounded-input border border-input bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm"
          >
            <option value={ALL}>{t('financial.summary.allAccounts')}</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase">{t('financial.statements.from')}</label>
          <DatePicker value={dateFrom} onChange={setDateFrom} className="mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase">{t('financial.statements.to')}</label>
          <DatePicker value={dateTo} onChange={setDateTo} className="mt-0.5" />
        </div>
      </div>

      {/* Summary header — standard bank-extract layout: opening → credits → debits → closing */}
      {accountId && statement && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SummaryStat label={t('financial.statements.opening')} value={fmt(statement.openingBalance)} />
          <SummaryStat label={t('financial.statements.totalCredits')} value={fmt(statement.totalCredits)} positive />
          <SummaryStat label={t('financial.statements.totalDebits')} value={fmt(statement.totalDebits)} negative />
          <SummaryStat label={t('financial.statements.closing')} value={fmt(statement.closingBalance)} accent />
        </div>
      )}

      {/* Statement table */}
      {!accountId ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border-2 border-dashed border-muted">
          <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t('financial.statements.selectToView')}</p>
        </div>
      ) : statementLoading ? (
        <DataTable columns={columns} data={[]} loading skeletonRows={8} compact />
      ) : entries.length === 0 ? (
        <DataTable columns={columns} data={[]} emptyMessage={t('financial.statements.noTransactions')} compact />
      ) : (
        <DataTable columns={columns} data={entries} compact />
      )}

      {showTransfer && (
        <TransferModal
          defaultFromId={accountId && accountId !== ALL ? accountId : undefined}
          onClose={() => setShowTransfer(false)}
          onDone={() => setShowTransfer(false)}
        />
      )}
    </div>
  )
}

function SummaryStat({ label, value, accent, positive, negative }: {
  label: string
  value: string
  accent?: boolean
  positive?: boolean
  negative?: boolean
}) {
  const valueClass = positive ? 'text-success' : negative ? 'text-destructive' : accent ? 'text-foreground' : 'text-foreground'
  return (
    <div className={`rounded-lg border px-3 py-2 ${accent ? 'bg-muted/40' : 'bg-card'}`}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase truncate">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${valueClass}`}>{value}</p>
    </div>
  )
}
