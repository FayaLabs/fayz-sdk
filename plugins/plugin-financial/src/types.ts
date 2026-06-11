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
  debitAccountId?: string
  creditAccountId?: string
  notes?: string
  metadata?: Record<string, unknown>
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
  bankAccountId: string
  dateRange: DateRange
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

export interface StatementEntry {
  movement: FinancialMovement
  invoice?: Invoice
  runningBalance: number
}

export interface CashSessionSummary {
  session: CashSession
  movementCount: number
  totalInflow: number
  totalOutflow: number
}
