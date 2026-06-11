import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from './lib/dedup'
import { toast } from '@fayz/ui'
import type { FinancialDataProvider } from './data/types'
import type {
  Invoice, FinancialMovement, BankAccount, CashSession,
  PaymentMethod, PaymentMethodType, CardTransaction,
  FinancialSummary, StatementEntry,
  InvoiceQuery, MovementQuery, StatementQuery,
  CreateInvoiceInput, PayMovementInput,
  OpenCashSessionInput, CloseCashSessionInput,
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

  statementEntries: StatementEntry[]
  statementLoading: boolean

  cardTransactions: CardTransaction[]
  cardsLoading: boolean

  // Actions
  fetchSummary(dateRange?: DateRange): Promise<void>
  fetchInvoices(query: InvoiceQuery): Promise<void>
  fetchBankAccounts(): Promise<void>
  fetchCashSessions(bankAccountId?: string): Promise<void>
  fetchPaymentMethods(): Promise<void>
  fetchStatement(query: StatementQuery): Promise<void>
  fetchCardTransactions(dateRange?: DateRange): Promise<void>
  createInvoice(input: CreateInvoiceInput): Promise<Invoice>
  payMovement(input: PayMovementInput): Promise<void>
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

    statementEntries: [],
    statementLoading: false,

    cardTransactions: [],
    cardsLoading: false,

    async fetchSummary(dateRange) {
      return dedup('fin:summary', async () => {
        set({ summaryLoading: true })
        const summary = await provider.getSummary(dateRange)
        set({ summary, summaryLoading: false })
      })
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
        set({ statementLoading: true })
        const statementEntries = await provider.getStatement(query)
        set({ statementEntries, statementLoading: false })
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
