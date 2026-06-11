import type { FinancialDataProvider } from './types'
import type {
  Invoice, InvoiceItem, FinancialMovement, BankAccount,
  CashSession, PaymentMethod, PaymentMethodType, ChartOfAccountsNode,
  CardTransaction,
  CreateInvoiceInput, PayMovementInput,
  OpenCashSessionInput, CloseCashSessionInput, CreateBankAccountInput,
  InvoiceQuery, MovementQuery, StatementQuery,
  PaginatedResult, FinancialSummary, StatementEntry, CashSessionSummary,
  DateRange, InvoiceStatus, MovementStatus,
} from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 1
function uid(): string {
  return String(nextId++)
}

function now(): string {
  return new Date().toISOString()
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function matchesDateRange(dateStr: string | undefined, range?: DateRange): boolean {
  if (!range || !dateStr) return true
  return dateStr >= range.from && dateStr <= range.to
}

function matchesStatus<T extends string>(status: T, filter?: T | T[]): boolean {
  if (!filter) return true
  if (Array.isArray(filter)) return filter.includes(status)
  return status === filter
}

function paginate<T>(items: T[], page?: number, pageSize?: number): PaginatedResult<T> {
  const p = page ?? 1
  const ps = pageSize ?? 50
  const start = (p - 1) * ps
  return { data: items.slice(start, start + ps), total: items.length }
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

interface MockStore {
  invoices: Invoice[]
  invoiceItems: InvoiceItem[]
  movements: FinancialMovement[]
  bankAccounts: BankAccount[]
  cashSessions: CashSession[]
  paymentMethods: PaymentMethod[]
  paymentMethodTypes: PaymentMethodType[]
  chartOfAccounts: ChartOfAccountsNode[]
  cardTransactions: CardTransaction[]
}

function createStore(seedPaymentMethodTypes?: Array<{ name: string; transactionType?: string }>): MockStore {
  const tenantId = 'mock-tenant'

  const defaultPMTypes: PaymentMethodType[] = (seedPaymentMethodTypes ?? [
    { name: 'Cash', transactionType: 'cash' },
    { name: 'Credit Card', transactionType: 'credit_card' },
    { name: 'Debit Card', transactionType: 'debit_card' },
    { name: 'PIX', transactionType: 'pix' },
    { name: 'Bank Transfer', transactionType: 'transfer' },
  ]).map((t) => ({
    id: uid(),
    name: t.name,
    transactionType: t.transactionType,
    isActive: true,
    tenantId,
    createdAt: now(),
  }))

  const cashAccount: BankAccount = {
    id: uid(),
    name: 'Main Cash Register',
    accountType: 'cash_register',
    currentBalance: 0,
    initialBalance: 0,
    isActive: true,
    tenantId,
    createdAt: now(),
    updatedAt: now(),
  }

  const bankAccount: BankAccount = {
    id: uid(),
    name: 'Business Checking',
    accountType: 'bank_account',
    bankName: 'Main Bank',
    currentBalance: 0,
    initialBalance: 0,
    isActive: true,
    tenantId,
    createdAt: now(),
    updatedAt: now(),
  }

  return {
    invoices: [],
    invoiceItems: [],
    movements: [],
    bankAccounts: [cashAccount, bankAccount],
    cashSessions: [],
    paymentMethods: [],
    paymentMethodTypes: defaultPMTypes,
    chartOfAccounts: [],
    cardTransactions: [],
  }
}

// ---------------------------------------------------------------------------
// Mock provider factory
// ---------------------------------------------------------------------------

export interface MockFinancialProviderOptions {
  paymentMethodTypes?: Array<{ name: string; transactionType?: string }>
}

export function createMockFinancialProvider(options?: MockFinancialProviderOptions): FinancialDataProvider {
  const store = createStore(options?.paymentMethodTypes)
  const tenantId = 'mock-tenant'

  function recalcInvoiceStatus(invoice: Invoice): void {
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = 'paid'
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial'
    } else {
      // Check if any movement is overdue
      const movements = store.movements.filter((m) => m.invoiceId === invoice.id && m.movementKind === 'bill')
      const hasOverdue = movements.some((m) => m.status === 'overdue' || (m.status === 'pending' && m.dueDate < today()))
      invoice.status = hasOverdue ? 'overdue' : 'open'
    }
    invoice.updatedAt = now()
  }

  const provider: FinancialDataProvider = {
    // --- Invoices ---
    async getInvoices(query: InvoiceQuery): Promise<PaginatedResult<Invoice>> {
      let results = [...store.invoices]
      if (query.direction) results = results.filter((i) => i.direction === query.direction)
      if (query.status) results = results.filter((i) => matchesStatus(i.status, query.status as InvoiceStatus | InvoiceStatus[]))
      if (query.contactId) results = results.filter((i) => i.contactId === query.contactId)
      if (query.dateRange) results = results.filter((i) => matchesDateRange(i.invoiceDate, query.dateRange))
      if (query.search) {
        const s = query.search.toLowerCase()
        results = results.filter((i) =>
          i.contactName?.toLowerCase().includes(s) ||
          i.observations?.toLowerCase().includes(s) ||
          i.fiscalNumber?.toLowerCase().includes(s)
        )
      }
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return paginate(results, query.page, query.pageSize)
    },

    async getInvoiceById(id: string): Promise<Invoice | null> {
      return store.invoices.find((i) => i.id === id) ?? null
    },

    async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
      return store.invoiceItems.filter((i) => i.invoiceId === invoiceId)
    },

    async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
      const invoiceId = uid()
      const totalAmount = input.items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice - (item.discount ?? 0) + (item.surcharge ?? 0)
        return sum + itemTotal
      }, 0)

      const itemsSummary = input.items.map((i) => i.description).filter(Boolean).join(', ')

      const invoice: Invoice = {
        id: invoiceId,
        direction: input.direction,
        invoiceDate: input.invoiceDate,
        fiscalNumber: input.fiscalNumber,
        totalAmount,
        paidAmount: 0,
        status: 'open',
        totalInstallments: input.installments.length || 1,
        contactId: input.contactId,
        contactName: input.contactName,
        cashSessionId: input.cashSessionId,
        unitId: input.unitId,
        observations: input.observations,
        itemsSummary: itemsSummary || undefined,
        metadata: input.metadata,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      store.invoices.push(invoice)

      // Create items
      for (const itemInput of input.items) {
        const itemTotal = itemInput.quantity * itemInput.unitPrice - (itemInput.discount ?? 0) + (itemInput.surcharge ?? 0)
        const item: InvoiceItem = {
          id: uid(),
          invoiceId,
          itemKind: itemInput.itemKind,
          referenceId: itemInput.referenceId,
          description: itemInput.description,
          quantity: itemInput.quantity,
          unitPrice: itemInput.unitPrice,
          totalAmount: itemTotal,
          discount: itemInput.discount ?? 0,
          surcharge: itemInput.surcharge ?? 0,
          accountId: itemInput.accountId,
          costCenterId: itemInput.costCenterId,
          metadata: itemInput.metadata,
          createdAt: now(),
        }
        store.invoiceItems.push(item)
      }

      // Create installment movements
      for (const movInput of input.installments) {
        const movement: FinancialMovement = {
          id: uid(),
          invoiceId,
          direction: input.direction,
          movementKind: movInput.movementKind,
          amount: movInput.amount,
          paidAmount: 0,
          status: 'pending',
          dueDate: movInput.dueDate,
          installmentNumber: movInput.installmentNumber,
          paymentMethodId: movInput.paymentMethodId,
          bankAccountId: movInput.bankAccountId,
          notes: movInput.notes,
          metadata: movInput.metadata,
          tenantId,
          createdAt: now(),
          updatedAt: now(),
        }
        store.movements.push(movement)
      }

      return invoice
    },

    async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
      const invoice = store.invoices.find((i) => i.id === id)
      if (!invoice) throw new Error(`Invoice ${id} not found`)
      Object.assign(invoice, data, { updatedAt: now() })
      return invoice
    },

    async cancelInvoice(id: string): Promise<void> {
      const invoice = store.invoices.find((i) => i.id === id)
      if (!invoice) throw new Error(`Invoice ${id} not found`)
      invoice.status = 'cancelled'
      invoice.updatedAt = now()
      // Cancel all pending movements
      store.movements
        .filter((m) => m.invoiceId === id && m.status === 'pending')
        .forEach((m) => { m.status = 'cancelled'; m.updatedAt = now() })
    },

    // --- Movements ---
    async getMovements(query: MovementQuery): Promise<PaginatedResult<FinancialMovement>> {
      let results = [...store.movements]
      if (query.direction) results = results.filter((m) => m.direction === query.direction)
      if (query.status) results = results.filter((m) => matchesStatus(m.status, query.status as MovementStatus | MovementStatus[]))
      if (query.bankAccountId) results = results.filter((m) => m.bankAccountId === query.bankAccountId)
      if (query.cashSessionId) results = results.filter((m) => m.cashSessionId === query.cashSessionId)
      if (query.dateRange) results = results.filter((m) => matchesDateRange(m.dueDate, query.dateRange))
      results.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      return paginate(results, query.page, query.pageSize)
    },

    async payMovement(input: PayMovementInput): Promise<FinancialMovement> {
      const movement = store.movements.find((m) => m.id === input.movementId)
      if (!movement) throw new Error(`Movement ${input.movementId} not found`)

      movement.paidAmount += input.amount
      movement.paymentDate = input.paymentDate
      movement.paymentMethodId = input.paymentMethodId ?? movement.paymentMethodId
      movement.bankAccountId = input.bankAccountId ?? movement.bankAccountId
      movement.cashSessionId = input.cashSessionId ?? movement.cashSessionId
      movement.cardBrand = input.cardBrand
      movement.cardInstallments = input.cardInstallments
      movement.status = movement.paidAmount >= movement.amount ? 'paid' : 'partial'
      movement.updatedAt = now()

      // Update bank account balance
      if (movement.bankAccountId) {
        const account = store.bankAccounts.find((a) => a.id === movement.bankAccountId)
        if (account) {
          if (movement.direction === 'credit') {
            account.currentBalance += input.amount
          } else {
            account.currentBalance -= input.amount
          }
          account.updatedAt = now()
        }
      }

      // Recalculate invoice status
      if (movement.invoiceId) {
        const invoice = store.invoices.find((i) => i.id === movement.invoiceId)
        if (invoice) {
          const invoiceMovements = store.movements.filter((m) => m.invoiceId === invoice.id && m.movementKind === 'bill')
          invoice.paidAmount = invoiceMovements.reduce((sum, m) => sum + m.paidAmount, 0)
          recalcInvoiceStatus(invoice)
        }
      }

      return movement
    },

    async cancelMovement(id: string): Promise<void> {
      const movement = store.movements.find((m) => m.id === id)
      if (!movement) throw new Error(`Movement ${id} not found`)
      movement.status = 'cancelled'
      movement.updatedAt = now()
    },

    // --- Bank Accounts ---
    async getBankAccounts(): Promise<BankAccount[]> {
      return store.bankAccounts.filter((a) => a.isActive)
    },

    async createBankAccount(data: CreateBankAccountInput): Promise<BankAccount> {
      const account: BankAccount = {
        id: uid(),
        name: data.name,
        accountType: data.accountType,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        agencyNumber: data.agencyNumber,
        currentBalance: data.initialBalance ?? 0,
        initialBalance: data.initialBalance ?? 0,
        creditLimit: data.creditLimit,
        dueDay: data.dueDay,
        closingDay: data.closingDay,
        isActive: true,
        unitId: data.unitId,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      store.bankAccounts.push(account)
      return account
    },

    async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
      const account = store.bankAccounts.find((a) => a.id === id)
      if (!account) throw new Error(`Bank account ${id} not found`)
      Object.assign(account, data, { updatedAt: now() })
      return account
    },

    // --- Cash Sessions ---
    async getCashSessions(bankAccountId?: string): Promise<CashSession[]> {
      let results = [...store.cashSessions]
      if (bankAccountId) results = results.filter((s) => s.bankAccountId === bankAccountId)
      return results.sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    },

    async getOpenSession(bankAccountId: string): Promise<CashSession | null> {
      return store.cashSessions.find((s) => s.bankAccountId === bankAccountId && s.status === 'open') ?? null
    },

    async openCashSession(input: OpenCashSessionInput): Promise<CashSession> {
      const account = store.bankAccounts.find((a) => a.id === input.bankAccountId)
      const session: CashSession = {
        id: uid(),
        bankAccountId: input.bankAccountId,
        bankAccountName: account?.name,
        status: 'open',
        openedAt: now(),
        openedByUserId: input.openedByUserId,
        openedByName: input.openedByName,
        openingBalance: input.openingBalance,
        unitId: input.unitId,
        tenantId,
        createdAt: now(),
      }
      store.cashSessions.push(session)
      return session
    },

    async closeCashSession(input: CloseCashSessionInput): Promise<CashSession> {
      const session = store.cashSessions.find((s) => s.id === input.sessionId)
      if (!session) throw new Error(`Cash session ${input.sessionId} not found`)

      // Calculate expected balance
      const sessionMovements = store.movements.filter((m) => m.cashSessionId === session.id && m.status === 'paid')
      const inflow = sessionMovements.filter((m) => m.direction === 'credit').reduce((s, m) => s + m.paidAmount, 0)
      const outflow = sessionMovements.filter((m) => m.direction === 'debit').reduce((s, m) => s + m.paidAmount, 0)
      const expectedBalance = session.openingBalance + inflow - outflow

      session.status = 'closed'
      session.closedAt = now()
      session.closedByUserId = input.closedByUserId
      session.closedByName = input.closedByName
      session.closingBalance = input.closingBalance
      session.expectedBalance = expectedBalance
      session.difference = input.closingBalance - expectedBalance
      session.notes = input.notes

      return session
    },

    async getCashSessionSummary(sessionId: string): Promise<CashSessionSummary> {
      const session = store.cashSessions.find((s) => s.id === sessionId)
      if (!session) throw new Error(`Cash session ${sessionId} not found`)
      const sessionMovements = store.movements.filter((m) => m.cashSessionId === sessionId && m.status === 'paid')
      return {
        session,
        movementCount: sessionMovements.length,
        totalInflow: sessionMovements.filter((m) => m.direction === 'credit').reduce((s, m) => s + m.paidAmount, 0),
        totalOutflow: sessionMovements.filter((m) => m.direction === 'debit').reduce((s, m) => s + m.paidAmount, 0),
      }
    },

    // --- Payment Methods ---
    async getPaymentMethods(): Promise<PaymentMethod[]> {
      return store.paymentMethods.filter((pm) => pm.isActive)
    },

    async getPaymentMethodTypes(): Promise<PaymentMethodType[]> {
      return store.paymentMethodTypes.filter((t) => t.isActive)
    },

    // --- Chart of Accounts ---
    async getChartOfAccounts(): Promise<ChartOfAccountsNode[]> {
      return store.chartOfAccounts.filter((n) => n.isActive)
    },

    // --- Card Transactions ---
    async getCardTransactions(dateRange?: DateRange): Promise<CardTransaction[]> {
      let results = [...store.cardTransactions]
      if (dateRange) results = results.filter((t) => matchesDateRange(t.expectedDate, dateRange))
      return results.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))
    },

    // --- Statements ---
    async getStatement(query: StatementQuery): Promise<StatementEntry[]> {
      const account = store.bankAccounts.find((a) => a.id === query.bankAccountId)
      if (!account) return []

      const movements = store.movements
        .filter((m) =>
          m.bankAccountId === query.bankAccountId &&
          m.status === 'paid' &&
          matchesDateRange(m.paymentDate, query.dateRange)
        )
        .sort((a, b) => (a.paymentDate ?? '').localeCompare(b.paymentDate ?? ''))

      let runningBalance = account.initialBalance
      const entries: StatementEntry[] = []

      for (const movement of movements) {
        if (movement.direction === 'credit') {
          runningBalance += movement.paidAmount
        } else {
          runningBalance -= movement.paidAmount
        }
        const invoice = movement.invoiceId
          ? store.invoices.find((i) => i.id === movement.invoiceId)
          : undefined
        entries.push({ movement, invoice, runningBalance })
      }

      return entries
    },

    // --- Summary ---
    async getSummary(dateRange?: DateRange): Promise<FinancialSummary> {
      const totalBalance = store.bankAccounts
        .filter((a) => a.isActive)
        .reduce((sum, a) => sum + a.currentBalance, 0)

      const pendingReceivable = store.movements.filter((m) =>
        m.direction === 'credit' && m.movementKind === 'bill' && ['pending', 'partial'].includes(m.status)
      )
      const pendingPayable = store.movements.filter((m) =>
        m.direction === 'debit' && m.movementKind === 'bill' && ['pending', 'partial'].includes(m.status)
      )

      const todayStr = today()
      const monthStart = todayStr.slice(0, 7) + '-01'
      const monthEnd = todayStr

      const monthMovements = store.movements.filter((m) =>
        m.status === 'paid' && matchesDateRange(m.paymentDate, dateRange ?? { from: monthStart, to: monthEnd })
      )

      const overdueReceivable = pendingReceivable.filter((m) => m.dueDate < todayStr)
      const overduePayable = pendingPayable.filter((m) => m.dueDate < todayStr)

      return {
        totalBalance,
        totalReceivable: pendingReceivable.reduce((s, m) => s + (m.amount - m.paidAmount), 0),
        totalPayable: pendingPayable.reduce((s, m) => s + (m.amount - m.paidAmount), 0),
        monthlyInflow: monthMovements.filter((m) => m.direction === 'credit').reduce((s, m) => s + m.paidAmount, 0),
        monthlyOutflow: monthMovements.filter((m) => m.direction === 'debit').reduce((s, m) => s + m.paidAmount, 0),
        overdueReceivableCount: overdueReceivable.length,
        overdueReceivableAmount: overdueReceivable.reduce((s, m) => s + (m.amount - m.paidAmount), 0),
        overduePayableCount: overduePayable.length,
        overduePayableAmount: overduePayable.reduce((s, m) => s + (m.amount - m.paidAmount), 0),
      }
    },
  }

  return provider
}
