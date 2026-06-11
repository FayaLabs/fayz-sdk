// ---------------------------------------------------------------------------
// Bridge factory: adapts FinancialDataProvider → AgendaFinancialBridge
// Consumer apps call this at plugin wiring time.
// ---------------------------------------------------------------------------

import type { FinancialDataProvider } from '@fayz/plugin-financial'
import type { AgendaFinancialBridge, BookingPaymentSummary, BookingPaymentDetail, BookingPaymentStatus } from '../financial-bridge'
import { getSupabaseClientOptional } from '@fayz/core'

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
        const { data: orders } = await supabase
          .schema('saas_core')
          .from('orders')
          .select('id, kind, stage, status, total, reference_number, metadata')
          .in('id', orderIds)
          .in('stage', ['booked', 'invoiced', 'paid', 'partial', 'overdue', 'cancelled'])

        for (const order of orders ?? []) {
          const meta = (order.metadata ?? {}) as Record<string, unknown>
          result.set(order.id, {
            invoiceId: order.id,
            referenceNumber: order.reference_number as string | undefined,
            status: mapInvoiceStatus(order.stage as string),
            totalAmount: Number(order.total) || 0,
            paidAmount: Number(meta.paidAmount) || 0,
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
        supabase.schema('saas_core').from('orders').select('id, stage, total, reference_number, metadata').eq('id', orderId).single(),
        supabase.from('financial_movements').select('*').eq('invoice_id', orderId).order('due_date'),
      ])

      const order = orderRes.data
      if (!order) return null
      const meta = (order.metadata ?? {}) as Record<string, unknown>

      // Collect unique payment_method_type_ids to resolve names in one query
      const typeIds = [...new Set((movRes.data ?? []).map((m: any) => m.payment_method_type_id).filter(Boolean))]
      let typeNames: Record<string, string> = {}
      if (typeIds.length > 0) {
        const { data: types } = await supabase.from('payment_method_types').select('id, name').in('id', typeIds)
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
        status: mapInvoiceStatus(order.stage as string),
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
      // Promote the existing service_order to an invoice_receivable — no duplication
      const supabase = getSupabaseClientOptional() as any
      if (!supabase) throw new Error('Supabase not available')

      const { data: order } = await supabase
        .schema('saas_core')
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (!order) throw new Error('Order not found')

      // Get client name for metadata
      let contactName: string | undefined
      if (order.party_id) {
        const { data: person } = await supabase
          .schema('saas_core')
          .from('persons')
          .select('name')
          .eq('id', order.party_id)
          .single()
        contactName = person?.name as string | undefined
      }

      // Get items summary
      const { data: orderItems } = await supabase
        .schema('saas_core')
        .from('order_items')
        .select('name')
        .eq('order_id', orderId)
        .order('sort_order', { ascending: true })

      const itemsSummary = (orderItems ?? []).map((i: any) => i.name).filter(Boolean).join(', ')
      const total = Number(order.total) || 0
      const installmentCount = options?.installments ?? 1
      const dueDate = options?.dueDate ?? new Date().toISOString().slice(0, 10)

      // 1. Generate sequential reference number
      const { data: seq } = await supabase
        .schema('saas_core')
        .rpc('next_sequence', { p_tenant_id: order.tenant_id, p_kind: 'invoice_receivable' })
      const referenceNumber = seq ? `REC-${String(seq).padStart(5, '0')}` : undefined

      // 2. Promote order stage to invoiced — don't touch agenda status
      await supabase
        .schema('saas_core')
        .from('orders')
        .update({
          stage: 'invoiced',
          direction: 'credit',
          reference_number: referenceNumber,
          metadata: { ...((order.metadata as Record<string, unknown>) ?? {}), source: 'agenda', itemsSummary, contactName, installmentCount },
        })
        .eq('id', orderId)

      // 2. Create financial movements (installments) against the same order
      const installments = Array.from({ length: installmentCount }, (_, i) => {
        const due = new Date(dueDate)
        due.setMonth(due.getMonth() + i)
        const amt = Math.round((total / installmentCount) * 100) / 100
        return {
          tenant_id: order.tenant_id,
          invoice_id: orderId,
          direction: 'credit',
          movement_kind: 'bill',
          amount: amt,
          paid_amount: 0,
          status: 'pending',
          due_date: due.toISOString().slice(0, 10),
          installment_number: i + 1,
        }
      })

      // Fix rounding on last installment
      if (installments.length > 1) {
        const sumSoFar = installments.slice(0, -1).reduce((s, inst) => s + inst.amount, 0)
        installments[installments.length - 1].amount = Math.round((total - sumSoFar) * 100) / 100
      }

      await supabase
        .from('financial_movements')
        .insert(installments)

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

function mapInvoiceStatus(stage: string): BookingPaymentStatus {
  switch (stage) {
    case 'paid': return 'paid'
    case 'partial': return 'partial'
    case 'overdue': return 'overdue'
    case 'cancelled': return 'cancelled'
    case 'invoiced': return 'pending'
    case 'booked': return 'none'
    default: return 'pending'
  }
}
