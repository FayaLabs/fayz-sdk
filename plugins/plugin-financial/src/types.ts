// ---------------------------------------------------------------------------
// Financial Module — Pure TypeScript types
// Zero dependencies. Maps to beautyplace DB schema but with English names.
// ---------------------------------------------------------------------------

// ============================================================
// ENUMS / LITERALS
// ============================================================

/** Direction: debit (money going out / payable) or credit (money coming in / receivable) */
export type TransactionDirection = 'debit' | 'credit'

/** What kind of financial movement this is */
export type MovementKind = 'bill' | 'payment' | 'transfer'

/** Status of a financial movement */
export type MovementStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'

/** Status of an invoice */
export type InvoiceStatus = 'draft' | 'open' | 'partial' | 'paid' | 'cancelled' | 'overdue'

/** Type of bank account */
export type BankAccountType = 'bank_account' | 'cash_register' | 'credit_card' | 'digital_wallet'

/** Cash session status */
export type CashSessionStatus = 'open' | 'closed'

/** Discount/interest application mode */
export type AdjustmentMode = 'percentage' | 'fixed'

/** Chart of accounts node type */
export type AccountNodeType = 'group' | 'leaf'

/** Item type on an invoice line — parametrizable per vertical */
export type InvoiceItemKind = string

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Invoice {
  id: string
  direction: TransactionDirection
  invoiceDate: string
  fiscalNumber?: string
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  totalInstallments: number
  contactId?: string
  contactName?: string
  cashSessionId?: string
  unitId?: string
  observations?: string
  /** Denormalized summary of item descriptions for list display */
  itemsSummary?: string
  /** If this order has a scheduled time (booking), the start time */
  bookingStartsAt?: string
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  itemKind: InvoiceItemKind
  referenceId?: string
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
  discount: number
  surcharge: number
  accountId?: string
  costCenterId?: string
  // Service execution tracking (opt-in per vertical)
  isExecuted?: boolean
  executionDate?: string
  executedByProfessionalId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface FinancialMovement {
  id: string
  invoiceId?: string
  direction: TransactionDirection
  movementKind: MovementKind
  amount: number
  paidAmount: number
  status: MovementStatus
  dueDate: string
  paymentDate?: string
  installmentNumber?: number
  paymentMethodId?: string
  paymentMethodTypeId?: string
  bankAccountId?: string
  cashSessionId?: string
  cardBrand?: string
  cardInstallments?: number
  /** Processing/MDR fee deducted at settlement (net cash = paidAmount - feeAmount for credits) */
  feeAmount?: number
  debitAccountId?: string
  creditAccountId?: string
  notes?: string
  metadata?: Record<string, unknown>
  // --- Reconciliation (conciliação) ---
  /** Provider of an imported bank-statement line (set on imported movements only) */
  externalSource?: string
  /** Provider-unique id of the imported bank line (idempotency key with externalSource) */
  externalId?: string
  /** When this movement was reconciled — matched or accepted (undefined = pending) */
  reconciledAt?: string
  /** For an imported bank line: the internal movement it was matched to */
  matchedMovementId?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface BankAccount {
  id: string
  name: string
  accountType: BankAccountType
  bankName?: string
  accountNumber?: string
  agencyNumber?: string
  currentBalance: number
  initialBalance: number
  creditLimit?: number
  dueDay?: number
  closingDay?: number
  isActive: boolean
  unitId?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CashSession {
  id: string
  bankAccountId: string
  bankAccountName?: string
  status: CashSessionStatus
  openedAt: string
  openedByUserId?: string
  openedByName?: string
  openingBalance: number
  closedAt?: string
  closedByUserId?: string
  closedByName?: string
  closingBalance?: number
  expectedBalance?: number
  difference?: number
  notes?: string
  unitId?: string
  tenantId: string
  createdAt: string
}

export interface PaymentMethod {
  id: string
  name: string
  paymentMethodTypeId: string
  isActive: boolean
  discountMode?: AdjustmentMode
  discountValue?: number
  interestMode?: AdjustmentMode
  interestValue?: number
  minInstallments: number
  maxInstallments: number
  serviceFilterMode?: 'all' | 'include' | 'exclude'
  serviceFilterIds?: string[]
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface PaymentMethodType {
  id: string
  name: string
  transactionType?: string
  isActive: boolean
  allowedAccountTypes?: BankAccountType[]
  tenantId: string
  createdAt: string
}

export interface ChartOfAccountsNode {
  id: string
  code: string
  name: string
  nodeType: AccountNodeType
  parentId?: string
  isActive: boolean
  tenantId: string
  createdAt: string
}

export interface CostCenter {
  id: string
  code: string
  name: string
  isActive: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CardTransaction {
  id: string
  movementId: string
  cardBrand: string
  totalAmount: number
  installmentCount: number
  currentInstallment: number
  installmentAmount: number
  expectedDate: string
  receivedDate?: string
  fee?: number
  netAmount?: number
  status: 'pending' | 'received' | 'cancelled'
  tenantId: string
  createdAt: string
}

// ============================================================
// INPUT TYPES (create / mutate)
// ============================================================

export interface CreateInvoiceInput {
  direction: TransactionDirection
  invoiceDate: string
  fiscalNumber?: string
  contactId?: string
  contactName?: string
  cashSessionId?: string
  unitId?: string
  observations?: string
  metadata?: Record<string, unknown>
  items: CreateInvoiceItemInput[]
  installments: CreateMovementInput[]
}

export interface CreateInvoiceItemInput {
  itemKind: InvoiceItemKind
  referenceId?: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  surcharge?: number
  accountId?: string
  costCenterId?: string
  metadata?: Record<string, unknown>
}

export interface CreateMovementInput {
  direction: TransactionDirection
  movementKind: MovementKind
  amount: number
  dueDate: string
  installmentNumber?: number
  paymentMethodId?: string
  bankAccountId?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export interface PayMovementInput {
  movementId: string
  amount: number
  paymentDate: string
  paymentMethodId?: string
  paymentMethodTypeId?: string
  bankAccountId?: string
  cashSessionId?: string
  cardBrand?: string
  cardInstallments?: number
  /** Free-text payment description / memo shown in the extract */
  notes?: string
}

export interface OpenCashSessionInput {
  bankAccountId: string
  openingBalance: number
  openedByUserId?: string
  openedByName?: string
  unitId?: string
  notes?: string
}

export interface CloseCashSessionInput {
  sessionId: string
  closingBalance: number
  closedByUserId?: string
  closedByName?: string
  notes?: string
}

export interface CreateBankAccountInput {
  name: string
  accountType: BankAccountType
  bankName?: string
  accountNumber?: string
  agencyNumber?: string
  initialBalance?: number
  creditLimit?: number
  dueDay?: number
  closingDay?: number
  unitId?: string
}

// ============================================================
// QUERY / FILTER TYPES
// ============================================================

export interface DateRange {
  from: string
  to: string
}

export interface InvoiceQuery {
  direction?: TransactionDirection
  status?: InvoiceStatus | InvoiceStatus[]
  contactId?: string
  accountId?: string
  costCenterId?: string
  dateRange?: DateRange
  search?: string
  page?: number
  pageSize?: number
}

export interface MovementQuery {
  direction?: TransactionDirection
  status?: MovementStatus | MovementStatus[]
  bankAccountId?: string
  cashSessionId?: string
  dateRange?: DateRange
  page?: number
  pageSize?: number
}

export interface StatementQuery {
  /** Omit (or pass undefined) for a consolidated "All accounts" statement */
  bankAccountId?: string
  dateRange: DateRange
}

export interface CreateTransferInput {
  fromAccountId: string
  toAccountId: string
  amount: number
  /** YYYY-MM-DD — becomes payment_date on both ledger legs */
  date: string
  notes?: string
}

/**
 * "Log money in a few taps" (FAY-1225). A single-transaction quick-add that the
 * store expands into the right provider calls: expense/income → createInvoice
 * (+ payMovement when marked paid); transfer → createTransfer. Keeps the
 * Mobills-style form dumb — it only collects fields, the store does the plumbing.
 */
export type QuickTransactionType = 'expense' | 'income' | 'transfer'

export interface QuickTransactionInput {
  type: QuickTransactionType
  /** Positive amount in the account currency */
  amount: number
  /** YYYY-MM-DD */
  date: string
  /** When true, the movement is settled immediately (creates a paid cash event). */
  paid: boolean
  description?: string
  /** Chart-of-accounts / cost-center id (category chip) */
  categoryId?: string
  /** expense/income: bank account or card. transfer: source account. */
  bankAccountId?: string
  /** transfer: destination account */
  toAccountId?: string
  /** Marks the transaction as recurring (stored in metadata; UI affordance). */
  recurring?: boolean
}

export interface TransferResult {
  /** Shared correlation id stored in both legs' metadata */
  transferId: string
  debitMovementId: string
  creditMovementId: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ============================================================
// AGGREGATION TYPES
// ============================================================

export interface FinancialSummary {
  totalBalance: number
  totalReceivable: number
  totalPayable: number
  monthlyInflow: number
  monthlyOutflow: number
  overdueReceivableCount: number
  overdueReceivableAmount: number
  overduePayableCount: number
  overduePayableAmount: number
}

/** What a statement row represents — a normal movement or one leg of a transfer */
export type StatementEntryKind = 'movement' | 'transfer-in' | 'transfer-out'

export interface StatementEntry {
  movement: FinancialMovement
  invoice?: Invoice
  /** NET cash running balance after this row */
  runningBalance: number
  /** Amount that settled the receivable/payable (= paidAmount) */
  gross: number
  /** Processing/MDR fee deducted (>= 0) */
  fee: number
  /** Cash impact: gross - fee for credit; gross for debit */
  net: number
  entryKind: StatementEntryKind
  /** For transfers: the other side's account */
  counterAccountId?: string
  counterAccountName?: string
  /** When this row is a reconciled bank line, the internal movement it was matched to. */
  reconciledWith?: {
    movementId: string
    description?: string
    invoiceId?: string
    fiscalNumber?: string
    contactName?: string
  }
}

/** Full statement result with header context (opening/closing balance + period totals) */
export interface StatementResult {
  entries: StatementEntry[]
  /** Balance as of start-of-day dateFrom (excludes in-range rows) */
  openingBalance: number
  /** openingBalance + net of all in-range rows */
  closingBalance: number
  /** Sum of NET credits in range */
  totalCredits: number
  /** Sum of NET debits (cash out) in range */
  totalDebits: number
  /** Sum of fees in range */
  totalFees: number
  /** totalCredits - totalDebits */
  net: number
  /** Echo of the queried account; undefined for consolidated */
  accountId?: string
  /** Ledger-computed current balance of the selected account (as of today) */
  accountCurrentBalance?: number
}

export interface CashSessionSummary {
  session: CashSession
  movementCount: number
  totalInflow: number
  totalOutflow: number
}

// ============================================================
// RECONCILIATION (conciliação)
// ============================================================

/** A normalized bank-statement line, ready to import as a financial movement. */
export interface BankStatementLine {
  /** Provider-unique transaction id (idempotency key with externalSource) */
  externalId: string
  /** Provider that produced the line (e.g. 'plugbank', 'inter') */
  externalSource: string
  /** credit = money in, debit = money out */
  direction: TransactionDirection
  amount: number
  /** YYYY-MM-DD settlement date */
  date: string
  description: string
  /** Account the line belongs to; falls back to the import's bankAccountId */
  bankAccountId?: string
}

export interface ImportBankTransactionsInput {
  /** Default account for lines that don't carry their own */
  bankAccountId?: string
  lines: BankStatementLine[]
}

export interface ImportBankTransactionsResult {
  imported: number
  /** Lines skipped because they were already imported (idempotency) */
  duplicates: number
}

export interface UnreconciledQuery {
  bankAccountId?: string
  dateRange?: DateRange
}

/** A candidate internal movement to reconcile an imported bank line against. */
export interface ReconciliationCandidate {
  movement: FinancialMovement
  invoice?: Invoice
  /** 0..1 confidence from amount + date proximity */
  score: number
}

export interface ReconcileInput {
  /** The imported bank-line movement (externalSource set) */
  bankMovementId: string
  /** Internal movement to link; omit to accept the line standalone */
  matchedMovementId?: string
}
