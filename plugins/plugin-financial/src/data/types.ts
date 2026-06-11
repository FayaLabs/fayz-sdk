import type {
  Invoice, InvoiceItem, FinancialMovement, BankAccount,
  CashSession, PaymentMethod, PaymentMethodType, ChartOfAccountsNode,
  CardTransaction,
  CreateInvoiceInput, PayMovementInput,
  OpenCashSessionInput, CloseCashSessionInput, CreateBankAccountInput,
  InvoiceQuery, MovementQuery, StatementQuery,
  PaginatedResult, FinancialSummary, StatementEntry, CashSessionSummary,
  DateRange,
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
  getStatement(query: StatementQuery): Promise<StatementEntry[]>

  // --- Summary / Dashboard ---
  getSummary(dateRange?: DateRange): Promise<FinancialSummary>
}
