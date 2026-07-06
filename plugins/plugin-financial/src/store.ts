import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import { toast } from '@fayz-ai/ui'
import type { FinancialDataProvider } from './data/types'
import type {
  Invoice, FinancialMovement, BankAccount, CashSession,
  PaymentMethod, PaymentMethodType, CardTransaction,
  FinancialSummary, StatementResult,
  InvoiceQuery, MovementQuery, StatementQuery,
  CreateInvoiceInput, PayMovementInput, CreateTransferInput,
  OpenCashSessionInput, CloseCashSessionInput,
  QuickTransactionInput,
  DateRange,
} from './types'

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

export interface FinancialUIState {
  // Data cache
  invoices: Invoice[]
  invoicesTotal: number
  invoicesLoading: boolean
  invoiceQuery: InvoiceQuery

  movements: FinancialMovement[]
  movementsTotal: number
  movementsLoading: boolean

  bankAccounts: BankAccount[]
  bankAccountsLoading: boolean

  cashSessions: CashSession[]
  cashSessionsLoading: boolean

  paymentMethods: PaymentMethod[]
  paymentMethodTypes: PaymentMethodType[]

  summary: FinancialSummary | null
  summaryLoading: boolean
  summaryPeriod: 'week' | 'month' | 'total'
  summaryBankAccountId?: string

  statement: StatementResult | null
  statementLoading: boolean
  statementQuery: StatementQuery | null

  cardTransactions: CardTransaction[]
  cardsLoading: boolean

  // Actions
  fetchSummary(dateRange?: DateRange): Promise<void>
  setSummaryPeriod(period: 'week' | 'month' | 'total'): void
  setSummaryBankAccountId(bankAccountId?: string): void
  fetchInvoices(query: InvoiceQuery): Promise<void>
  fetchBankAccounts(): Promise<void>
  fetchCashSessions(bankAccountId?: string): Promise<void>
  fetchPaymentMethods(): Promise<void>
  fetchStatement(query: StatementQuery): Promise<void>
  fetchCardTransactions(dateRange?: DateRange): Promise<void>
  createInvoice(input: CreateInvoiceInput): Promise<Invoice>
  /** FAY-1225 "log money in a few taps": one call → the right provider plumbing + full surface refresh. */
  createQuickTransaction(input: QuickTransactionInput): Promise<void>
  payMovement(input: PayMovementInput): Promise<void>
  createTransfer(input: CreateTransferInput): Promise<void>
  cancelInvoice(invoiceId: string): Promise<void>
  openCashSession(input: OpenCashSessionInput): Promise<CashSession>
  closeCashSession(input: CloseCashSessionInput): Promise<CashSession>
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export function createFinancialStore(provider: FinancialDataProvider): StoreApi<FinancialUIState> {
  return createStore<FinancialUIState>((set, get) => ({
    invoices: [],
    invoicesTotal: 0,
    invoicesLoading: false,
    invoiceQuery: {},

    movements: [],
    movementsTotal: 0,
    movementsLoading: false,

    bankAccounts: [],
    bankAccountsLoading: false,

    cashSessions: [],
    cashSessionsLoading: false,

    paymentMethods: [],
    paymentMethodTypes: [],

    summary: null,
    summaryLoading: false,
    summaryPeriod: 'month',
    summaryBankAccountId: undefined,

    statement: null,
    statementLoading: false,
    statementQuery: null,

    cardTransactions: [],
    cardsLoading: false,

    async fetchSummary(dateRange) {
      const bankAccountId = get().summaryBankAccountId
      return dedup('fin:summary:' + JSON.stringify({ dateRange: dateRange ?? null, bankAccountId: bankAccountId ?? null }), async () => {
        set({ summaryLoading: true })
        const summary = await provider.getSummary({ dateRange, bankAccountId })
        set({ summary, summaryLoading: false })
      })
    },

    setSummaryPeriod(period) {
      set({ summaryPeriod: period })
    },

    setSummaryBankAccountId(bankAccountId) {
      set({ summaryBankAccountId: bankAccountId })
    },

    async fetchInvoices(query) {
      return dedup('fin:invoices:' + JSON.stringify(query), async () => {
        set({ invoicesLoading: true, invoiceQuery: query })
        const result = await provider.getInvoices(query)
        set({ invoices: result.data, invoicesTotal: result.total, invoicesLoading: false })
      })
    },

    async fetchBankAccounts() {
      return dedup('fin:bankAccounts', async () => {
        set({ bankAccountsLoading: true })
        const bankAccounts = await provider.getBankAccounts()
        set({ bankAccounts, bankAccountsLoading: false })
      })
    },

    async fetchCashSessions(bankAccountId) {
      return dedup('fin:cashSessions:' + (bankAccountId ?? ''), async () => {
        set({ cashSessionsLoading: true })
        const cashSessions = await provider.getCashSessions(bankAccountId)
        set({ cashSessions, cashSessionsLoading: false })
      })
    },

    async fetchPaymentMethods() {
      return dedup('fin:paymentMethods', async () => {
        const [paymentMethods, paymentMethodTypes] = await Promise.all([
          provider.getPaymentMethods(),
          provider.getPaymentMethodTypes(),
        ])
        set({ paymentMethods, paymentMethodTypes })
      })
    },

    async fetchStatement(query) {
      return dedup('fin:statement:' + JSON.stringify(query), async () => {
        set({ statementLoading: true, statementQuery: query })
        const statement = await provider.getStatement(query)
        set({ statement, statementLoading: false })
      })
    },

    async fetchCardTransactions(dateRange) {
      return dedup('fin:cards', async () => {
        set({ cardsLoading: true })
        const cardTransactions = await provider.getCardTransactions(dateRange)
        set({ cardTransactions, cardsLoading: false })
      })
    },

    async createInvoice(input) {
      try {
        const invoice = await provider.createInvoice(input)
        const query = get().invoiceQuery
        const result = await provider.getInvoices(query)
        const summary = await provider.getSummary()
        set({ invoices: result.data, invoicesTotal: result.total, summary })
        toast.success('Invoice created')
        return invoice
      } catch (err: any) {
        toast.error('Failed to create invoice', { description: err?.message })
        throw err
      }
    },

    async createQuickTransaction(input) {
      try {
        if (input.type === 'transfer') {
          if (!input.bankAccountId || !input.toAccountId) {
            throw new Error('Select source and destination accounts')
          }
          await provider.createTransfer({
            fromAccountId: input.bankAccountId,
            toAccountId: input.toAccountId,
            amount: input.amount,
            date: input.date,
            notes: input.description?.trim() || undefined,
          })
        } else {
          const direction: 'debit' | 'credit' = input.type === 'income' ? 'credit' : 'debit'
          const desc = input.description?.trim() || (input.type === 'income' ? 'Receita' : 'Despesa')
          // 1. The obligation (invoice + bill movement).
          // Persist the recurring flag + the snapped-receipt data URL (FAY-1226)
          // on the invoice metadata so the transaction feed can indicate/preview it.
          const invoiceMeta: Record<string, unknown> = {}
          if (input.recurring) invoiceMeta.recurring = true
          if (input.receiptUrl) invoiceMeta.receiptUrl = input.receiptUrl
          const invoice = await provider.createInvoice({
            direction,
            invoiceDate: input.date,
            contactName: desc,
            metadata: Object.keys(invoiceMeta).length > 0 ? invoiceMeta : undefined,
            items: [{
              itemKind: 'other',
              description: desc,
              quantity: 1,
              unitPrice: input.amount,
              accountId: input.categoryId,
            }],
            installments: [{
              direction,
              movementKind: 'bill',
              amount: input.amount,
              dueDate: input.date,
              installmentNumber: 1,
              bankAccountId: input.bankAccountId,
              notes: desc,
            }],
          })
          // 2. Settle it now when marked paid → a realized cash event that shows in
          //    the statement/extract and feeds the monthly cash-flow KPIs.
          if (input.paid) {
            const movements = await provider.getMovements({ direction, status: 'pending' })
            const bill = movements.data.find((m) => m.invoiceId === invoice.id && m.movementKind === 'bill')
            if (bill) {
              await provider.payMovement({
                movementId: bill.id,
                amount: input.amount,
                paymentDate: input.date,
                bankAccountId: input.bankAccountId,
                notes: desc,
              })
            }
          }
        }
        // Refresh every surface this store feeds: Home/Resumo KPIs (summary),
        // the mobile transaction list (statement), balances, and the payables/
        // receivables tables (invoices).
        const invoiceQuery = get().invoiceQuery
        const statementQuery = get().statementQuery
        const [summary, bankAccounts, invoicesRes, statement] = await Promise.all([
          provider.getSummary(),
          provider.getBankAccounts(),
          provider.getInvoices(invoiceQuery),
          statementQuery ? provider.getStatement(statementQuery) : Promise.resolve(get().statement),
        ])
        set({
          summary,
          bankAccounts,
          invoices: invoicesRes.data,
          invoicesTotal: invoicesRes.total,
          statement,
        })
        toast.success('Transaction saved')
      } catch (err: any) {
        toast.error('Failed to save transaction', { description: err?.message })
        throw err
      }
    },

    async payMovement(input) {
      try {
        await provider.payMovement(input)
        const query = get().invoiceQuery
        const [result, summary] = await Promise.all([provider.getInvoices(query), provider.getSummary()])
        set({ invoices: result.data, invoicesTotal: result.total, summary })
        toast.success('Payment recorded')
      } catch (err: any) {
        toast.error('Failed to record payment', { description: err?.message })
        throw err
      }
    },

    async createTransfer(input) {
      try {
        await provider.createTransfer(input)
        const query = get().statementQuery
        const [bankAccounts, summary, statement] = await Promise.all([
          provider.getBankAccounts(),
          provider.getSummary(),
          query ? provider.getStatement(query) : Promise.resolve(get().statement),
        ])
        set({ bankAccounts, summary, statement })
        toast.success('Transfer recorded')
      } catch (err: any) {
        toast.error('Failed to record transfer', { description: err?.message })
        throw err
      }
    },

    async cancelInvoice(invoiceId) {
      try {
        await provider.cancelInvoice(invoiceId)
        const query = get().invoiceQuery
        const [result, summary] = await Promise.all([provider.getInvoices(query), provider.getSummary()])
        set({ invoices: result.data, invoicesTotal: result.total, summary })
        toast.success('Invoice cancelled')
      } catch (err: any) {
        toast.error('Failed to cancel invoice', { description: err?.message })
        throw err
      }
    },

    async openCashSession(input) {
      try {
        const session = await provider.openCashSession(input)
        const cashSessions = await provider.getCashSessions()
        set({ cashSessions })
        toast.success('Cash session opened')
        return session
      } catch (err: any) {
        toast.error('Failed to open session', { description: err?.message })
        throw err
      }
    },

    async closeCashSession(input) {
      try {
        const session = await provider.closeCashSession(input)
        const cashSessions = await provider.getCashSessions()
        set({ cashSessions })
        toast.success('Cash session closed')
        return session
      } catch (err: any) {
        toast.error('Failed to close session', { description: err?.message })
        throw err
      }
    },
  }))
}
