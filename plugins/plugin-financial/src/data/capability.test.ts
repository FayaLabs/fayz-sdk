// Capability + contract test for plugin-financial (Plugin Capability Contract).
// Proves the data slice end-to-end against the mock provider — including the
// ⚖️ reconciliation (conciliação) feature: import bank lines → list unreconciled
// → suggest a match → reconcile → assert it leaves the pending set. Rows are
// created manually (mock provider), which is exactly how a capability is proven
// before/without a live backend. Mirrors plugins/plugin-tasks capability.test.ts.
import { describe, it, expect } from 'vitest'
import { createMockFinancialProvider } from './mock'

describe('plugin-financial · invoice/movement slice (mock provider)', () => {
  it('persists an invoice and its installment movements', async () => {
    const provider = createMockFinancialProvider()
    const invoice = await provider.createInvoice({
      direction: 'credit',
      invoiceDate: '2026-06-01',
      contactName: 'Acme',
      items: [{ itemKind: 'other', description: 'Consulting', quantity: 1, unitPrice: 300 }],
      installments: [
        { direction: 'credit', movementKind: 'bill', amount: 300, dueDate: '2026-06-10', installmentNumber: 1 },
      ],
    })
    expect(invoice.id).toBeTruthy()
    expect(invoice.totalAmount).toBe(300)

    const movs = await provider.getMovements({ direction: 'credit' })
    expect(movs.data.some((m) => m.invoiceId === invoice.id && m.amount === 300)).toBe(true)
  })

  it('filters invoices by item account and cost center assignments', async () => {
    const provider = createMockFinancialProvider()
    const target = await provider.createInvoice({
      direction: 'debit',
      invoiceDate: '2026-06-01',
      contactName: 'Supplier A',
      items: [{
        itemKind: 'other',
        description: 'Supplies',
        quantity: 1,
        unitPrice: 120,
        accountId: 'coa-expenses',
        costCenterId: 'cc-salon',
      }],
      installments: [
        { direction: 'debit', movementKind: 'bill', amount: 120, dueDate: '2026-06-10', installmentNumber: 1 },
      ],
    })
    await provider.createInvoice({
      direction: 'debit',
      invoiceDate: '2026-06-01',
      contactName: 'Supplier B',
      items: [{
        itemKind: 'other',
        description: 'Marketing',
        quantity: 1,
        unitPrice: 80,
        accountId: 'coa-marketing',
        costCenterId: 'cc-marketing',
      }],
      installments: [
        { direction: 'debit', movementKind: 'bill', amount: 80, dueDate: '2026-06-10', installmentNumber: 1 },
      ],
    })

    const byAccount = await provider.getInvoices({ direction: 'debit', accountId: 'coa-expenses' })
    expect(byAccount.data.map((invoice) => invoice.id)).toEqual([target.id])

    const byCostCenter = await provider.getInvoices({ direction: 'debit', costCenterId: 'cc-salon' })
    expect(byCostCenter.data.map((invoice) => invoice.id)).toEqual([target.id])

    const byBoth = await provider.getInvoices({ direction: 'debit', accountId: 'coa-expenses', costCenterId: 'cc-marketing' })
    expect(byBoth.data).toHaveLength(0)
  })
})

describe('plugin-financial · ⚖️ reconciliation capability (mock provider)', () => {
  it('imports bank lines idempotently', async () => {
    const provider = createMockFinancialProvider()
    const lines = [
      { externalId: 'tx-1', externalSource: 'plugbank', direction: 'credit' as const, amount: 150, date: '2026-06-10', description: 'PIX recebido' },
      { externalId: 'tx-2', externalSource: 'plugbank', direction: 'debit' as const, amount: 80, date: '2026-06-11', description: 'Tarifa' },
    ]
    const first = await provider.importBankTransactions!({ lines })
    expect(first.imported).toBe(2)
    expect(first.duplicates).toBe(0)

    // Re-importing the same lines must not duplicate (idempotency by external id).
    const second = await provider.importBankTransactions!({ lines })
    expect(second.imported).toBe(0)
    expect(second.duplicates).toBe(2)

    const pending = await provider.getUnreconciled!()
    expect(pending).toHaveLength(2)
    expect(pending.every((m) => m.externalSource === 'plugbank' && !m.reconciledAt)).toBe(true)
  })

  it('suggests and matches an internal movement, leaving the pending set', async () => {
    const provider = createMockFinancialProvider()
    // An internal receivable the bank line should reconcile against.
    await provider.createInvoice({
      direction: 'credit',
      invoiceDate: '2026-06-08',
      contactName: 'Acme',
      items: [{ itemKind: 'other', description: 'Service', quantity: 1, unitPrice: 150 }],
      installments: [{ direction: 'credit', movementKind: 'bill', amount: 150, dueDate: '2026-06-10', installmentNumber: 1 }],
    })
    // The imported bank line (same amount, same direction, near date).
    await provider.importBankTransactions!({
      lines: [{ externalId: 'tx-1', externalSource: 'plugbank', direction: 'credit', amount: 150, date: '2026-06-10', description: 'PIX Acme' }],
    })

    const [bankLine] = await provider.getUnreconciled!()
    expect(bankLine).toBeTruthy()

    const candidates = await provider.suggestReconciliation!(bankLine.id)
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].movement.amount).toBe(150)
    expect(candidates[0].score).toBeGreaterThan(0.5)

    await provider.reconcileMovement!({ bankMovementId: bankLine.id, matchedMovementId: candidates[0].movement.id })

    // The line is gone from the pending set and both sides are marked reconciled.
    const stillPending = await provider.getUnreconciled!()
    expect(stillPending.some((m) => m.id === bankLine.id)).toBe(false)
  })

  it('accepts a bank line standalone when there is no internal counterpart', async () => {
    const provider = createMockFinancialProvider()
    await provider.importBankTransactions!({
      lines: [{ externalId: 'tx-9', externalSource: 'plugbank', direction: 'debit', amount: 42, date: '2026-06-12', description: 'Taxa avulsa' }],
    })
    const [line] = await provider.getUnreconciled!()
    await provider.reconcileMovement!({ bankMovementId: line.id }) // no match → accept standalone
    expect(await provider.getUnreconciled!()).toHaveLength(0)
  })
})
