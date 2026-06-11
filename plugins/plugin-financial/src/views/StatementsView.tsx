import React, { useEffect, useState, useMemo } from 'react'
import { Receipt } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@fayz/ui'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { SubpageHeader } from '@fayz/ui'
import { DatePicker } from '@fayz/ui'
import { useTranslation } from '@fayz/core'
import type { StatementEntry } from '../types'

export function StatementsView() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const statementEntries = useFinancialStore((s) => s.statementEntries)
  const statementLoading = useFinancialStore((s) => s.statementLoading)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  const fetchStatement = useFinancialStore((s) => s.fetchStatement)

  const [accountId, setAccountId] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => { fetchBankAccounts() }, [])

  useEffect(() => {
    if (accountId) {
      fetchStatement({ bankAccountId: accountId, dateRange: { from: dateFrom, to: dateTo } })
    }
  }, [accountId, dateFrom, dateTo])

  useEffect(() => {
    if (!accountId && bankAccounts.length > 0) setAccountId(bankAccounts[0].id)
  }, [bankAccounts])

  const columns: ColumnDef<StatementEntry, any>[] = useMemo(() => [
    {
      id: 'date', header: t('financial.statements.columnDate'),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.movement.paymentDate ?? row.original.movement.dueDate}</span>
      ),
    },
    {
      id: 'description', header: t('financial.statements.columnDescription'),
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-medium">{row.original.invoice?.contactName || row.original.movement.notes || 'Transaction'}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{row.original.movement.movementKind}</p>
        </div>
      ),
    },
    {
      id: 'debit', header: t('financial.statements.columnDebit'),
      cell: ({ row }) => (
        <span className="text-right block text-destructive text-xs">
          {row.original.movement.direction === 'debit' ? formatCurrency(row.original.movement.paidAmount, currency) : ''}
        </span>
      ),
    },
    {
      id: 'credit', header: t('financial.statements.columnCredit'),
      cell: ({ row }) => (
        <span className="text-right block text-success text-xs">
          {row.original.movement.direction === 'credit' ? formatCurrency(row.original.movement.paidAmount, currency) : ''}
        </span>
      ),
    },
    {
      id: 'balance', header: t('financial.statements.columnBalance'),
      cell: ({ row }) => (
        <span className="text-right block font-medium text-xs">{formatCurrency(row.original.runningBalance, currency)}</span>
      ),
    },
  ], [currency, t])

  return (
    <div className="space-y-4">
      <SubpageHeader title={t('financial.statements.title')} subtitle={t('financial.statements.subtitle')} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 max-w-xs">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">{t('financial.statements.account')}</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full mt-0.5 rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] px-3 py-2 text-sm"
          >
            <option value="">{t('financial.statements.selectAccount')}</option>
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

      {/* Statement table */}
      {!accountId ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border-2 border-dashed border-muted">
          <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t('financial.statements.selectToView')}</p>
        </div>
      ) : statementLoading ? (
        <DataTable columns={columns} data={[]} loading skeletonRows={5} />
      ) : statementEntries.length === 0 ? (
        <DataTable columns={columns} data={[]} emptyMessage={t('financial.statements.noTransactions')} />
      ) : (
        <DataTable columns={columns} data={statementEntries} />
      )}
    </div>
  )
}
