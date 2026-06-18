import type {
  Invoice, InvoiceItem, FinancialMovement, BankAccount,
  CashSession, PaymentMethod, PaymentMethodType, ChartOfAccountsNode,
  CardTransaction,
  CreateInvoiceInput, PayMovementInput, CreateTransferInput, TransferResult,
  OpenCashSessionInput, CloseCashSessionInput, CreateBankAccountInput,
  InvoiceQuery, MovementQuery, StatementQuery,
  PaginatedResult, FinancialSummary, StatementResult, CashSessionSummary,
  DateRange,
  ImportBankTransactionsInput, ImportBankTransactionsResult,
  UnreconciledQuery, ReconciliationCandidate, ReconcileInput,
} from '../types'

export interface FinancialDataProvider {
  // --- Invoices ---
  getInvoices(query: InvoiceQuery): Promise<PaginatedResult<Invoice>>
  getInvoiceById(id: string): Promise<Invoice | null>
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>
  createInvoice(input: CreateInvoiceInput): Promise<Invoice>
  updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice>
  cancelInvoice(id: string): Promise<void>

  // --- Movements ---
  getMovements(query: MovementQuery): Promise<PaginatedResult<FinancialMovement>>
  payMovement(input: PayMovementInput): Promise<FinancialMovement>
  cancelMovement(id: string): Promise<void>

  // --- Transfers (between accounts) ---
  createTransfer(input: CreateTransferInput): Promise<TransferResult>

  // --- Bank Accounts ---
  getBankAccounts(): Promise<BankAccount[]>
  createBankAccount(data: CreateBankAccountInput): Promise<BankAccount>
  updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount>

  // --- Cash Sessions ---
  getCashSessions(bankAccountId?: string): Promise<CashSession[]>
  getOpenSession(bankAccountId: string): Promise<CashSession | null>
  openCashSession(input: OpenCashSessionInput): Promise<CashSession>
  closeCashSession(input: CloseCashSessionInput): Promise<CashSession>
  getCashSessionSummary(sessionId: string): Promise<CashSessionSummary>

  // --- Payment Methods ---
  getPaymentMethods(): Promise<PaymentMethod[]>
  getPaymentMethodTypes(): Promise<PaymentMethodType[]>

  // --- Chart of Accounts ---
  getChartOfAccounts(): Promise<ChartOfAccountsNode[]>

  // --- Card Transactions ---
  getCardTransactions(dateRange?: DateRange): Promise<CardTransaction[]>

  // --- Statements ---
  getStatement(query: StatementQuery): Promise<StatementResult>

  // --- Summary / Dashboard ---
  getSummary(dateRange?: DateRange): Promise<FinancialSummary>

  // --- Reconciliation (conciliação) ---
  // Optional: implemented by providers that back the matching UI. A bank
  // connector imports lines; the SDK ReconciliationView reads/matches them.
  /** Upsert normalized bank-statement lines as movements (idempotent by external id). */
  importBankTransactions?(input: ImportBankTransactionsInput): Promise<ImportBankTransactionsResult>
  /** Imported lines not yet reconciled (externalSource set, reconciledAt null). */
  getUnreconciled?(query?: UnreconciledQuery): Promise<FinancialMovement[]>
  /** Internal-movement candidates to match a given imported line, ranked by score. */
  suggestReconciliation?(bankMovementId: string): Promise<ReconciliationCandidate[]>
  /** Reconcile: link to an internal movement, or accept the line standalone. */
  reconcileMovement?(input: ReconcileInput): Promise<void>
  /** Undo a reconciliation. */
  unreconcileMovement?(bankMovementId: string): Promise<void>
}
