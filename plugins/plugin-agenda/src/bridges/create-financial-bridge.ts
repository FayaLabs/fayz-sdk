// ---------------------------------------------------------------------------
// Bridge factory: adapts FinancialDataProvider → AgendaFinancialBridge
// Consumer apps call this at plugin wiring time.
// ---------------------------------------------------------------------------

import type { FinancialDataProvider } from '@fayz-ai/plugin-financial'
import type { AgendaFinancialBridge, BookingPaymentSummary, BookingPaymentDetail, BookingPaymentStatus } from '../financial-bridge'
import { getSupabaseClientOptional } from '@fayz-ai/core'

/**
 * Pure commission math: percentage of a realized order total, rounded to cents.
 * Exported for unit-testing and reuse; the bridge method below wraps the I/O.
 * Returns 0 for a non-positive base or rate so callers can skip empty accruals.
 */
export function computeCommissionAmount(total: number, ratePercent: number): number {
  const base = Number(total) || 0
  const rate = Number(ratePercent) || 0
  if (base <= 0 || rate <= 0) return 0
  return Math.round(base * (rate / 100) * 100) / 100
}

function computeStatus(movements: Array<{ status: string }>): BookingPaymentStatus {
  if (movements.length === 0) return 'none'
  const allPaid = movements.every((m) => m.status === 'paid')
  if (allPaid) return 'paid'
  const allCancelled = movements.every((m) => m.status === 'cancelled')
  if (allCancelled) return 'cancelled'
  const anyOverdue = movements.some((m) => m.status === 'overdue')
  if (anyOverdue) return 'overdue'
  const anyPaid = movements.some((m) => m.status === 'paid' || m.status === 'partial')
  if (anyPaid) return 'partial'
  return 'pending'
}

/**
 * Create an AgendaFinancialBridge backed by the financial plugin's data provider.
 *
 * @example
 * const financialProvider = createSupabaseFinancialProvider()
 * const agenda = createAgendaPlugin({
 *   financialBridge: createFinancialBridge(financialProvider),
 * })
 */
export function createFinancialBridge(provider: FinancialDataProvider): AgendaFinancialBridge {
  return {
    async resolvePaymentStatuses(orderIds: string[]): Promise<Map<string, BookingPaymentSummary>> {
      const result = new Map<string, BookingPaymentSummary>()
      if (orderIds.length === 0) return result

      // Single batch query instead of N individual getInvoiceById calls
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return result

      try {
        const [{ data: orders }, { data: movements }] = await Promise.all([
          supabase
            .from('orders')
            .select('id, kind, status, total, reference_number, metadata')
            .in('id', orderIds),
          supabase
            .from('plg_financial_movements')
            .select('invoice_id, status, paid_amount')
            .in('invoice_id', orderIds),
        ])

        const movementsByOrderId = new Map<string, Array<{ status: string; paid_amount: number }>>()
        for (const movement of movements ?? []) {
          const invoiceId = movement.invoice_id as string | undefined
          if (!invoiceId) continue
          movementsByOrderId.set(invoiceId, [...(movementsByOrderId.get(invoiceId) ?? []), movement])
        }

        for (const order of orders ?? []) {
          const orderMovements = movementsByOrderId.get(order.id) ?? []
          const meta = (order.metadata ?? {}) as Record<string, unknown>
          const paidAmount = orderMovements.length > 0
            ? orderMovements.reduce((sum, movement) => sum + (Number(movement.paid_amount) || 0), 0)
            : Number(meta.paidAmount) || 0

          result.set(order.id, {
            invoiceId: order.id,
            referenceNumber: order.reference_number as string | undefined,
            status: orderMovements.length > 0 ? computeStatus(orderMovements) : mapInvoiceStatus(order.status as string),
            totalAmount: Number(order.total) || 0,
            paidAmount,
          })
        }
      } catch { /* non-blocking */ }

      return result
    },

    async getPaymentDetail(orderId: string): Promise<BookingPaymentDetail | null> {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return null

      // Single query: get order + movements in parallel
      const [orderRes, movRes] = await Promise.all([
        supabase.from('orders').select('id, status, total, reference_number, metadata').eq('id', orderId).single(),
        supabase.from('plg_financial_movements').select('*').eq('invoice_id', orderId).order('due_date'),
      ])

      const order = orderRes.data
      if (!order) return null
      const meta = (order.metadata ?? {}) as Record<string, unknown>

      // Collect unique payment_method_type_ids to resolve names in one query
      const typeIds = [...new Set((movRes.data ?? []).map((m: any) => m.payment_method_type_id).filter(Boolean))]
      let typeNames: Record<string, string> = {}
      if (typeIds.length > 0) {
        const { data: types } = await supabase.from('plg_financial_payment_method_types').select('id, name').in('id', typeIds)
        typeNames = Object.fromEntries((types ?? []).map((t: any) => [t.id, t.name]))
      }

      const movements = (movRes.data ?? []).map((m: Record<string, unknown>) => ({
        id: String(m.id),
        amount: Number(m.amount) || 0,
        paidAmount: Number(m.paid_amount) || 0,
        status: String(m.status ?? 'pending'),
        dueDate: String(m.due_date ?? ''),
        installmentNumber: m.installment_number != null ? Number(m.installment_number) : undefined,
        paymentDate: m.payment_date ? String(m.payment_date) : undefined,
        paymentMethodTypeName: m.payment_method_type_id ? typeNames[String(m.payment_method_type_id)] : undefined,
        cardBrand: m.card_brand ? String(m.card_brand) : undefined,
        cardInstallments: m.card_installments ? Number(m.card_installments) : undefined,
      }))

      return {
        invoiceId: order.id,
        referenceNumber: order.reference_number as string | undefined,
        status: movements.length > 0 ? computeStatus(movements) : mapInvoiceStatus(order.status as string),
        totalAmount: Number(order.total) || 0,
        paidAmount: Number(meta.paidAmount) || 0,
        movements,
      }
    },

    async createInvoiceFromOrder(orderId: string, options?: {
      installments?: number
      dueDate?: string
      paymentMethodTypeId?: string
    }): Promise<string> {
      // Promote the existing order to an invoice_receivable atomically via the
      // shared DB function (ref + stage/direction + N installments, idempotent).
      // status='invoiced' is valid for appointment/service_order (CHECK).
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) throw new Error('Supabase not available')
      const { error } = await supabase.rpc('fn_invoice_from_order', {
        p_order_id: orderId,
        p_due_date: options?.dueDate ?? null,
        p_status: 'invoiced',
        p_installments: options?.installments ?? 1,
        p_direction: 'credit',
      })
      if (error) throw new Error(error.message)
      return orderId
    },

    async payMovement(input) {
      await provider.payMovement({
        movementId: input.movementId,
        amount: input.amount,
        paymentDate: input.paymentDate,
        paymentMethodTypeId: input.paymentMethodTypeId,
        paymentMethodId: input.paymentMethodId,
        bankAccountId: input.bankAccountId,
        cardBrand: input.cardBrand,
        cardInstallments: input.cardInstallments,
      })
    },

    async createCommissionMovement(orderId, options) {
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) return null

      // Order carries the assigned professional (assignee_id) and realized total.
      const { data: order } = await supabase
        .from('orders')
        .select('id, tenant_id, assignee_id, total')
        .eq('id', orderId)
        .single()
      if (!order || !order.assignee_id) return null // no professional → no commission

      // Per-professional rate lives on staff_members, surfaced via v_staff (id = person id).
      const { data: staff } = await supabase
        .from('v_staff')
        .select('commission_rate')
        .eq('id', order.assignee_id)
        .single()

      const rate = Number(staff?.commission_rate) || 0
      const base = Number(order.total) || 0
      const amount = computeCommissionAmount(base, rate)
      if (amount <= 0) return null // nothing configured/realized to accrue

      // Idempotent: one commission accrual per order. Reuse if already present.
      const { data: existing } = await supabase
        .from('plg_financial_movements')
        .select('id')
        .eq('invoice_id', orderId)
        .eq('movement_kind', 'commission')
        .limit(1)
      if (existing && existing.length > 0) return existing[0].id as string

      const dueDate = options?.dueDate ?? new Date().toISOString().slice(0, 10)

      const { data: inserted } = await supabase
        .from('plg_financial_movements')
        .insert({
          tenant_id: order.tenant_id,
          invoice_id: orderId,
          direction: 'debit', // payable to the professional
          movement_kind: 'commission',
          amount,
          paid_amount: 0,
          status: 'pending',
          due_date: dueDate,
          metadata: {
            source: 'agenda',
            kind: 'commission',
            professionalId: order.assignee_id,
            commissionRate: rate,
            baseAmount: base,
          },
        })
        .select('id')
        .single()

      return (inserted?.id as string | undefined) ?? null
    },

    async checkout(orderId, input) {
      // 1. Create invoice (single installment, due today)
      const today = new Date().toISOString().slice(0, 10)
      const invoiceId = await this.createInvoiceFromOrder(orderId, { installments: 1, dueDate: today })

      // 2. Get the created movement
      const detail = await this.getPaymentDetail(invoiceId)
      if (!detail || detail.movements.length === 0) throw new Error('No movement created')

      const movement = detail.movements[0]

      // 3. Pay it in full
      await this.payMovement({
        movementId: movement.id,
        amount: movement.amount,
        paymentDate: today,
        paymentMethodTypeId: input.paymentMethodTypeId,
        paymentMethodId: input.paymentMethodId,
        bankAccountId: input.bankAccountId,
        cardBrand: input.cardBrand,
        cardInstallments: input.cardInstallments,
      })

      // 4. Return updated detail
      return (await this.getPaymentDetail(invoiceId))!
    },

    async getPaymentMethodTypes() {
      const types = await provider.getPaymentMethodTypes()
      return types.map((t: any) => ({ id: t.id, name: t.name, transactionType: t.transactionType }))
    },

    async getBankAccounts() {
      const accounts = await provider.getBankAccounts()
      return accounts
        .filter((a: any) => a.isActive)
        .map((a: any) => ({ id: a.id, name: a.name, accountType: a.accountType }))
    },

    async getPaymentMethods(paymentMethodTypeId: string) {
      const methods = await provider.getPaymentMethods()
      return methods
        .filter((m: any) => m.paymentMethodTypeId === paymentMethodTypeId && m.isActive)
        .map((m: any) => ({ id: m.id, name: m.name }))
    },
  }
}

function mapInvoiceStatus(status: string): BookingPaymentStatus {
  switch (status) {
    case 'paid': return 'paid'
    case 'partial': return 'partial'
    case 'overdue': return 'overdue'
    case 'cancelled': return 'cancelled'
    case 'invoiced': return 'pending'
    case 'pending': return 'pending'
    case 'scheduled': return 'none'
    case 'confirmed': return 'none'
    case 'in_progress': return 'none'
    case 'completed': return 'none'
    case 'no_show': return 'none'
    case 'booked': return 'none'
    default: return 'pending'
  }
}
