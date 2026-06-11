// ---------------------------------------------------------------------------
// Agenda × Financial Bridge — Cross-plugin integration types
// Pure types only. Runtime implementation in bridges/create-financial-bridge.ts
// ---------------------------------------------------------------------------

/** Payment status for a booking's linked invoice */
export type BookingPaymentStatus = 'none' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

/** Compact payment summary for calendar enrichment */
export interface BookingPaymentSummary {
  invoiceId: string
  referenceNumber?: string
  status: BookingPaymentStatus
  totalAmount: number
  paidAmount: number
}

/** Detailed payment info with installment breakdown */
export interface BookingPaymentDetail extends BookingPaymentSummary {
  movements: Array<{
    id: string
    amount: number
    paidAmount: number
    status: string
    dueDate: string
    installmentNumber?: number
    paymentDate?: string
    paymentMethodTypeName?: string
    cardBrand?: string
    cardInstallments?: number
  }>
}

/**
 * Bridge interface for agenda → financial plugin integration.
 * Injected via `AgendaPluginOptions.financialBridge`.
 * Follows the same DI pattern as `EntityLookup`.
 */
export interface AgendaFinancialBridge {
  /** Batch-resolve payment status for multiple order IDs (for calendar enrichment) */
  resolvePaymentStatuses(orderIds: string[]): Promise<Map<string, BookingPaymentSummary>>

  /** Get detailed payment info for a single booking's order */
  getPaymentDetail(orderId: string): Promise<BookingPaymentDetail | null>

  /** Create a receivable invoice from the booking's service_order. Returns invoice ID */
  createInvoiceFromOrder(orderId: string, options?: {
    installments?: number
    dueDate?: string
    paymentMethodTypeId?: string
  }): Promise<string>

  /** Record a payment against a movement (installment) */
  payMovement(input: {
    movementId: string
    amount: number
    paymentDate: string
    paymentMethodTypeId?: string
    paymentMethodId?: string
    bankAccountId?: string
    cardBrand?: string
    cardInstallments?: number
  }): Promise<void>

  /** One-step POS checkout: create invoice + pay in full. Returns paid detail. */
  checkout(orderId: string, input: {
    paymentMethodTypeId: string
    paymentMethodId?: string
    bankAccountId?: string
    cardBrand?: string
    cardInstallments?: number
  }): Promise<BookingPaymentDetail>

  /** Get payment methods filtered by type */
  getPaymentMethods?(paymentMethodTypeId: string): Promise<Array<{ id: string; name: string }>>

  /** Get payment method types for the payment UI */
  getPaymentMethodTypes(): Promise<Array<{ id: string; name: string; transactionType?: string }>>

  /** Get bank accounts for payment destination */
  getBankAccounts(): Promise<Array<{ id: string; name: string; accountType: string }>>
}
