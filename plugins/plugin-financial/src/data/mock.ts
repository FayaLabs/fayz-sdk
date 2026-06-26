import type { FinancialDataProvider } from './types'
import type {
  Invoice, InvoiceItem, FinancialMovement, BankAccount,
  CashSession, PaymentMethod, PaymentMethodType, ChartOfAccountsNode,
  CardTransaction,
  CreateInvoiceInput, PayMovementInput, CreateTransferInput, TransferResult,
  OpenCashSessionInput, CloseCashSessionInput, CreateBankAccountInput,
  InvoiceQuery, MovementQuery, StatementQuery,
  PaginatedResult, FinancialSummary, StatementEntry, StatementResult, CashSessionSummary,
  DateRange, SummaryQuery, InvoiceStatus, MovementStatus,
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

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function normalizeSummaryQuery(query?: DateRange | SummaryQuery): SummaryQuery {
  if (!query) return {}
  if ('from' in query || 'to' in query) return { dateRange: query as DateRange }
  return query
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
      const bill = store.movements.find((m) => m.id === input.movementId)
      if (!bill) throw new Error(`Movement ${input.movementId} not found`)

      // Net card settlement: derive the processing/MDR fee from the payment method (credits only).
      const method = input.paymentMethodId ? store.paymentMethods.find((pm) => pm.id === input.paymentMethodId) : undefined
      const feePct = bill.direction === 'credit' ? (method?.discountValue ?? 0) : 0
      const thisFee = round2(input.amount * (feePct / 100))

      // 1. Record the cash event as its OWN payment movement (one row per payment).
      const payment: FinancialMovement = {
        id: uid(),
        invoiceId: bill.invoiceId,
        direction: bill.direction,
        movementKind: 'payment',
        amount: input.amount,
        paidAmount: input.amount,
        feeAmount: thisFee,
        status: 'paid',
        dueDate: bill.dueDate,
        paymentDate: input.paymentDate,
        installmentNumber: bill.installmentNumber,
        paymentMethodId: input.paymentMethodId,
        paymentMethodTypeId: input.paymentMethodTypeId,
        bankAccountId: input.bankAccountId,
        cashSessionId: input.cashSessionId,
        cardBrand: input.cardBrand,
        cardInstallments: input.cardInstallments,
        notes: input.notes,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      store.movements.push(payment)

      // 2. Update the bill (obligation) cache: cumulative paid + status. Clear its cash
      //    fields so it stops being a cash event (the payment row is now the cash event).
      bill.paidAmount = round2(bill.paidAmount + input.amount)
      bill.status = bill.paidAmount >= bill.amount ? 'paid' : 'partial'
      bill.paymentDate = undefined
      bill.bankAccountId = undefined
      bill.updatedAt = now()

      // Update bank account balance by the NET cash impact (credit nets the fee).
      if (input.bankAccountId) {
        const account = store.bankAccounts.find((a) => a.id === input.bankAccountId)
        if (account) {
          if (bill.direction === 'credit') {
            account.currentBalance = round2(account.currentBalance + (input.amount - thisFee))
          } else {
            account.currentBalance = round2(account.currentBalance - input.amount)
          }
          account.updatedAt = now()
        }
      }

      // 3. Recalculate invoice status from its bills
      if (bill.invoiceId) {
        const invoice = store.invoices.find((i) => i.id === bill.invoiceId)
        if (invoice) {
          const bills = store.movements.filter((m) => m.invoiceId === invoice.id && m.movementKind === 'bill')
          invoice.paidAmount = bills.reduce((sum, m) => sum + m.paidAmount, 0)
          recalcInvoiceStatus(invoice)
        }
      }

      return payment
    },

    async cancelMovement(id: string): Promise<void> {
      const movement = store.movements.find((m) => m.id === id)
      if (!movement) throw new Error(`Movement ${id} not found`)
      movement.status = 'cancelled'
      movement.updatedAt = now()
    },

    // --- Transfers (between accounts) ---
    async createTransfer(input: CreateTransferInput): Promise<TransferResult> {
      if (!input.fromAccountId || !input.toAccountId || input.fromAccountId === input.toAccountId) {
        throw new Error('Source and destination accounts must differ')
      }
      if (!(input.amount > 0)) throw new Error('Amount must be greater than zero')
      const transferId = uid()
      const debitMovementId = uid()
      const creditMovementId = uid()
      const base = {
        movementKind: 'transfer' as const,
        amount: input.amount,
        paidAmount: input.amount,
        feeAmount: 0,
        status: 'paid' as const,
        dueDate: input.date,
        paymentDate: input.date,
        notes: input.notes,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      store.movements.push({
        ...base, id: debitMovementId, direction: 'debit', bankAccountId: input.fromAccountId,
        metadata: { transferId, transferRole: 'out', counterAccountId: input.toAccountId },
      } as FinancialMovement)
      store.movements.push({
        ...base, id: creditMovementId, direction: 'credit', bankAccountId: input.toAccountId,
        metadata: { transferId, transferRole: 'in', counterAccountId: input.fromAccountId },
      } as FinancialMovement)
      // Reflect in stored balances.
      const from = store.bankAccounts.find((a) => a.id === input.fromAccountId)
      const to = store.bankAccounts.find((a) => a.id === input.toAccountId)
      if (from) { from.currentBalance = round2(from.currentBalance - input.amount); from.updatedAt = now() }
      if (to) { to.currentBalance = round2(to.currentBalance + input.amount); to.updatedAt = now() }
      return { transferId, debitMovementId, creditMovementId }
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

    // --- Statements (ERP extract: opening balance + realized cash + per-row net/fee) ---
    async getStatement(query: StatementQuery): Promise<StatementResult> {
      const todayStr = today()
      // A cash event = any non-cancelled movement with a payment_date (payment, transfer,
      // or a legacy in-place-paid bill). Bills lose their payment_date once split.
      const isRealized = (m: FinancialMovement) => m.status !== 'cancelled' && !!m.paymentDate
      const consolidated = !query.bankAccountId
      const scopeAccounts = consolidated
        ? store.bankAccounts.filter((a) => a.isActive)
        : store.bankAccounts.filter((a) => a.id === query.bankAccountId)
      const accountIds = new Set(scopeAccounts.map((a) => a.id))
      const accountNameById = new Map(store.bankAccounts.map((a) => [a.id, a.name]))
      const initialSum = scopeAccounts.reduce((s, a) => s + a.initialBalance, 0)
      // Only bail when a specific account was asked for and not found.
      if (!consolidated && accountIds.size === 0) {
        return { entries: [], openingBalance: 0, closingBalance: 0, totalCredits: 0, totalDebits: 0, totalFees: 0, net: 0, accountId: query.bankAccountId }
      }

      const netOf = (m: FinancialMovement) => m.direction === 'credit'
        ? m.paidAmount - (m.feeAmount ?? 0)
        : -m.paidAmount

      // Consolidated => all realized movements (incl. those with no bank account).
      const inScope = store.movements.filter((m) =>
        isRealized(m) && (consolidated || (m.bankAccountId && accountIds.has(m.bankAccountId))))

      const openingBalance = round2(initialSum + inScope
        .filter((m) => (m.paymentDate ?? '') < query.dateRange.from)
        .reduce((s, m) => s + netOf(m), 0))

      const rangeMovs = inScope
        .filter((m) => matchesDateRange(m.paymentDate, query.dateRange))
        .sort((a, b) => (a.paymentDate ?? '').localeCompare(b.paymentDate ?? '') || a.createdAt.localeCompare(b.createdAt))

      let balance = openingBalance
      let totalCredits = 0, totalDebits = 0, totalFees = 0
      const entries: StatementEntry[] = rangeMovs.map((movement) => {
        const gross = movement.paidAmount
        const isCredit = movement.direction === 'credit'
        const fee = isCredit ? (movement.feeAmount ?? 0) : 0
        const net = isCredit ? round2(gross - fee) : gross
        const isTransfer = movement.movementKind === 'transfer'
        const meta = (movement.metadata ?? {}) as any
        const entryKind: StatementEntry['entryKind'] = isTransfer
          ? (meta.transferRole === 'in' ? 'transfer-in' : 'transfer-out')
          : 'movement'
        const counterAccountId = isTransfer ? meta.counterAccountId : undefined
        balance = round2(isCredit ? balance + net : balance - net)
        if (!(consolidated && isTransfer)) {
          if (isCredit) totalCredits = round2(totalCredits + net)
          else totalDebits = round2(totalDebits + net)
          totalFees = round2(totalFees + fee)
        }
        return {
          movement,
          invoice: movement.invoiceId ? store.invoices.find((i) => i.id === movement.invoiceId) : undefined,
          runningBalance: balance,
          gross, fee, net, entryKind,
          counterAccountId,
          counterAccountName: counterAccountId ? accountNameById.get(counterAccountId) : undefined,
        } as StatementEntry
      })

      // Link reconciled bank lines to the internal movement they were matched to.
      for (const e of entries) {
        const mid = e.movement.matchedMovementId
        const mm = mid ? store.movements.find((m) => m.id === mid) : undefined
        if (!mm) continue
        const inv = mm.invoiceId ? store.invoices.find((i) => i.id === mm.invoiceId) : undefined
        e.reconciledWith = {
          movementId: mm.id,
          description: mm.notes ?? undefined,
          invoiceId: mm.invoiceId,
          fiscalNumber: inv?.fiscalNumber,
          contactName: inv?.contactName,
        }
      }

      const accountCurrentBalance = round2(initialSum + inScope
        .filter((m) => (m.paymentDate ?? '') <= todayStr)
        .reduce((s, m) => s + netOf(m), 0))

      return {
        entries,
        openingBalance,
        closingBalance: balance,
        totalCredits,
        totalDebits,
        totalFees,
        net: round2(totalCredits - totalDebits),
        accountId: query.bankAccountId,
        accountCurrentBalance,
      }
    },

    // --- Summary ---
    async getSummary(query?: DateRange | SummaryQuery): Promise<FinancialSummary> {
      const { dateRange, bankAccountId } = normalizeSummaryQuery(query)
      const totalBalance = store.bankAccounts
        .filter((a) => a.isActive && (!bankAccountId || a.id === bankAccountId))
        .reduce((sum, a) => sum + a.currentBalance, 0)

      const pendingReceivable = store.movements.filter((m) =>
        m.direction === 'credit' && m.movementKind === 'bill' && ['pending', 'partial'].includes(m.status)
        && (!bankAccountId || m.bankAccountId === bankAccountId)
      )
      const pendingPayable = store.movements.filter((m) =>
        m.direction === 'debit' && m.movementKind === 'bill' && ['pending', 'partial'].includes(m.status)
        && (!bankAccountId || m.bankAccountId === bankAccountId)
      )

      const todayStr = today()
      const monthStart = todayStr.slice(0, 7) + '-01'
      const monthEnd = todayStr

      const monthMovements = store.movements.filter((m) =>
        m.movementKind === 'payment' && matchesDateRange(m.paymentDate, dateRange ?? { from: monthStart, to: monthEnd })
        && (!bankAccountId || m.bankAccountId === bankAccountId)
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

    // --- Reconciliation (conciliação) ---
    async importBankTransactions(input) {
      let imported = 0, duplicates = 0
      for (const line of input.lines) {
        const dup = store.movements.some((m) => m.externalSource === line.externalSource && m.externalId === line.externalId)
        if (dup) { duplicates++; continue }
        store.movements.push({
          id: uid(),
          direction: line.direction,
          movementKind: 'payment',
          amount: line.amount,
          paidAmount: line.amount,
          status: 'paid',
          dueDate: line.date,
          paymentDate: line.date,
          bankAccountId: line.bankAccountId ?? input.bankAccountId,
          notes: line.description,
          externalId: line.externalId,
          externalSource: line.externalSource,
          tenantId,
          createdAt: now(),
          updatedAt: now(),
        } as FinancialMovement)
        imported++
      }
      return { imported, duplicates }
    },

    async getUnreconciled(query) {
      let results = store.movements.filter((m) => m.externalSource && !m.reconciledAt)
      if (query?.bankAccountId) results = results.filter((m) => m.bankAccountId === query.bankAccountId)
      if (query?.dateRange) results = results.filter((m) => matchesDateRange(m.paymentDate, query.dateRange))
      return results.sort((a, b) => (b.paymentDate ?? '').localeCompare(a.paymentDate ?? ''))
    },

    async suggestReconciliation(bankMovementId) {
      const line = store.movements.find((m) => m.id === bankMovementId)
      if (!line) return []
      const amount = line.amount
      const tol = Math.max(0.01, round2(amount * 0.02))
      const lineDate = line.paymentDate ?? line.dueDate
      return store.movements
        .filter((m) => !m.externalSource && !m.reconciledAt && m.direction === line.direction && m.id !== bankMovementId && Math.abs(m.amount - amount) <= tol)
        .map((m) => {
          const amtScore = amount > 0 ? Math.max(0, 1 - Math.abs(m.amount - amount) / amount) : 0
          const refDate = m.dueDate ?? m.paymentDate
          const days = lineDate && refDate ? Math.abs((new Date(lineDate).getTime() - new Date(refDate).getTime()) / 86400000) : 30
          const dateScore = Math.max(0, 1 - days / 30)
          return {
            movement: m,
            invoice: m.invoiceId ? store.invoices.find((i) => i.id === m.invoiceId) : undefined,
            score: round2(0.7 * amtScore + 0.3 * dateScore),
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 25)
    },

    async reconcileMovement(input) {
      const line = store.movements.find((m) => m.id === input.bankMovementId)
      if (line) { line.reconciledAt = now(); line.matchedMovementId = input.matchedMovementId; line.updatedAt = now() }
      if (input.matchedMovementId) {
        const internal = store.movements.find((m) => m.id === input.matchedMovementId)
        if (internal) { internal.reconciledAt = now(); internal.updatedAt = now() }
      }
    },

    async unreconcileMovement(bankMovementId) {
      const line = store.movements.find((m) => m.id === bankMovementId)
      if (!line) return
      const matchedId = line.matchedMovementId
      line.reconciledAt = undefined; line.matchedMovementId = undefined; line.updatedAt = now()
      if (matchedId) {
        const internal = store.movements.find((m) => m.id === matchedId)
        if (internal) { internal.reconciledAt = undefined; internal.updatedAt = now() }
      }
    },
  }

  return provider
}
