import type { FinancialDataProvider } from './types'
import type {
  Invoice, InvoiceItem, FinancialMovement, BankAccount,
  CashSession, PaymentMethod, PaymentMethodType, ChartOfAccountsNode,
  CostCenter, CardTransaction,
  CreateInvoiceInput, PayMovementInput, CreateTransferInput, TransferResult,
  OpenCashSessionInput, CloseCashSessionInput, CreateBankAccountInput,
  InvoiceQuery, MovementQuery, StatementQuery,
  PaginatedResult, FinancialSummary, StatementEntry, StatementResult, CashSessionSummary,
  DateRange, ReconciliationCandidate,
} from '../types'
import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import { getFinancialTenantId } from '../lib/tenant'
import { T } from './tables'

function getTenantId(): string | undefined {
  // Local override wins; else use the app's active tenant so writes pass RLS.
  return getFinancialTenantId() ?? getActiveTenantId()
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value
  }
  return result
}

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue
    result[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = value
  }
  return result
}

function getClients() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  // Core tables now live in PUBLIC (legacy dedicated core schema is gone). Both
  // handles are the single public client; `core` retained for call-site readability.
  return { core: supabase, pub: supabase }
}

/** Map order stage to InvoiceStatus for the financial UI */
function mapStageToInvoiceStatus(stage?: string): string {
  switch (stage) {
    case 'paid': return 'paid'
    case 'partial': return 'partial'
    case 'overdue': return 'overdue'
    case 'cancelled': return 'cancelled'
    case 'invoiced': return 'open'
    case 'booked': return 'open'
    default: return 'open'
  }
}

let _overdueSwept = false

/** Batch-mark overdue: pending/partial movements past due → 'overdue', then update parent invoices */
async function sweepOverdue() {
  if (_overdueSwept) return
  _overdueSwept = true
  try {
    const { core, pub } = getClients()
    const today = new Date().toISOString().slice(0, 10)

    // Mark overdue movements
    const { data: overdueMovs } = await pub.from(T.movements)
      .update({ status: 'overdue' })
      .in('status', ['pending', 'partial'])
      .lt('due_date', today)
      .select('invoice_id')

    // Collect unique invoice IDs and update their status
    if (overdueMovs && overdueMovs.length > 0) {
      const invoiceIds = [...new Set(overdueMovs.map((m: any) => m.invoice_id).filter(Boolean))]
      for (const invId of invoiceIds) {
        const { data: allMovs } = await pub.from(T.movements)
          .select('status')
          .eq('invoice_id', invId)
          .eq('movement_kind', 'bill')
        const movs = allMovs ?? []
        const hasOverdue = movs.some((m: any) => m.status === 'overdue')
        const allPaid = movs.every((m: any) => m.status === 'paid')
        const invoiceStatus = allPaid ? 'paid' : hasOverdue ? 'overdue' : 'open'
        const invoiceStage = allPaid ? 'paid' : hasOverdue ? 'overdue' : 'invoiced'
        // Only update financial stage — don't overwrite agenda status
        await core.from('orders').update({ stage: invoiceStage }).eq('id', invId)
      }
    }
  } catch {
    // Non-critical — don't block the UI
  }
}

// S2 (data-model refactor): paid amount, balance and status are DERIVED from the
// append-only ledger via v_invoice_balances — the single source of truth — not
// from stored order.stage / metadata.paidAmount (which drift). See
// docs/DATA-MODEL.md.
async function fetchInvoiceBalances(
  pub: any,
  ids: string[],
): Promise<Map<string, { paid: number; balance: number; status: string }>> {
  const map = new Map<string, { paid: number; balance: number; status: string }>()
  if (!ids.length) return map
  const { data } = await pub
    .from('v_invoice_balances')
    .select('invoice_id, paid, balance, status')
    .in('invoice_id', ids)
  for (const r of (data ?? []) as any[]) {
    map.set(r.invoice_id, { paid: Number(r.paid) || 0, balance: Number(r.balance) || 0, status: r.status })
  }
  return map
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

async function findOrderIdsByItemMetadata(
  core: any,
  filters: { accountId?: string; costCenterId?: string },
): Promise<string[] | undefined> {
  if (!filters.accountId && !filters.costCenterId) return undefined

  let qb = core.from('order_items').select('order_id')
  if (filters.accountId) qb = qb.filter('metadata->>accountId', 'eq', filters.accountId)
  if (filters.costCenterId) qb = qb.filter('metadata->>costCenterId', 'eq', filters.costCenterId)

  const { data } = await qb
  const ids: string[] = []
  for (const row of (data ?? []) as Array<{ order_id?: unknown }>) {
    if (typeof row.order_id === 'string' && row.order_id.length > 0) ids.push(row.order_id)
  }
  return Array.from(new Set(ids))
}

/** Card/MDR fee percent for a configured payment method (0 when none / not a fee method). */
async function getMethodFeePct(pub: any, paymentMethodId?: string): Promise<number> {
  if (!paymentMethodId) return 0
  const { data } = await pub.from(T.paymentMethods).select('discount_value').eq('id', paymentMethodId).single()
  return Number(data?.discount_value) || 0
}

/** Generate a correlation id; falls back when crypto.randomUUID is unavailable. */
function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID()
  } catch { /* noop */ }
  return 'tr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export function createSupabaseFinancialProvider(): FinancialDataProvider {
  const provider: FinancialDataProvider = {
    // --- Invoices (orders at stage=invoiced/paid/partial/overdue/cancelled with direction) ---
    async getInvoices(query: InvoiceQuery): Promise<PaginatedResult<Invoice>> {
      const { core, pub } = getClients()
      let qb = core.from('orders').select('*', { count: 'exact' })

      // Show orders with financial relevance: booked (with amount) + invoiced stages
      qb = qb.in('stage', ['booked', 'invoiced', 'paid', 'partial', 'overdue', 'cancelled'])
      qb = qb.gt('total', 0)

      // Filter by direction (credit=receivable, debit=payable)
      if (query.direction) {
        qb = qb.eq('direction', query.direction)
      }

      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        qb = qb.in('status', statuses)
      }
      const itemScopedOrderIds = await findOrderIdsByItemMetadata(core, {
        accountId: query.accountId,
        costCenterId: query.costCenterId,
      })
      if (itemScopedOrderIds) {
        if (itemScopedOrderIds.length === 0) return { data: [], total: 0 }
        qb = qb.in('id', itemScopedOrderIds)
      }
      if (query.contactId) qb = qb.eq('party_id', query.contactId)
      if (query.search) qb = qb.ilike('notes', `%${query.search}%`)
      if (query.dateRange) qb = qb.gte('created_at', query.dateRange.from).lte('created_at', query.dateRange.to)
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('created_at', { ascending: false })
      const { data, count } = await qb

      const bal = await fetchInvoiceBalances(pub, (data ?? []).map((r: any) => r.id))
      const invoices: Invoice[] = (data ?? []).map((r: any) => {
        const meta = r.metadata ?? {}
        // Resolve direction from stage model or legacy kind
        const dir = r.direction ?? (r.kind === 'invoice_payable' ? 'debit' : 'credit')
        const b = bal.get(r.id)
        return {
          id: r.id,
          direction: dir,
          invoiceDate: r.created_at?.slice(0, 10) ?? '',
          fiscalNumber: r.reference_number,
          totalAmount: r.total ?? 0,
          paidAmount: b?.paid ?? meta.paidAmount ?? 0,
          status: b?.status ?? mapStageToInvoiceStatus(r.stage),
          totalInstallments: meta.installmentCount ?? 1,
          contactId: r.party_id,
          contactName: meta.contactName,
          observations: r.notes,
          itemsSummary: meta.itemsSummary,
          tenantId: r.tenant_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        } as Invoice
      })
      return { data: invoices, total: count ?? 0 }
    },

    async getInvoiceById(id: string): Promise<Invoice | null> {
      const { core, pub } = getClients()
      const { data } = await core.from('orders').select('*').eq('id', id).single()
      if (!data) return null
      const o = snakeToCamel(data) as any
      const meta = data.metadata ?? {}
      // Paid amount + status are DERIVED from the ledger view (single source of truth).
      const balance = (await fetchInvoiceBalances(pub, [id])).get(id)
      const { data: movs } = await pub.from(T.movements)
        .select('paid_amount')
        .eq('invoice_id', id)
        .eq('movement_kind', 'bill')
      return {
        id: o.id,
        direction: o.direction ?? (o.kind === 'invoice_payable' ? 'debit' : 'credit'),
        invoiceDate: o.createdAt?.slice(0, 10) ?? '',
        fiscalNumber: o.referenceNumber,
        totalAmount: o.total ?? 0, paidAmount: balance?.paid ?? 0,
        status: balance?.status ?? mapStageToInvoiceStatus(o.stage),
        totalInstallments: (movs ?? []).length || 1, contactId: o.partyId,
        contactName: meta.contactName, itemsSummary: meta.itemsSummary,
        bookingStartsAt: o.startsAt ?? undefined,
        observations: o.notes,
        tenantId: o.tenantId, createdAt: o.createdAt, updatedAt: o.updatedAt,
      } as Invoice
    },

    async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
      const { core, pub } = getClients()
      const { data } = await core.from('order_items').select('*').eq('order_id', invoiceId).order('sort_order')
      return (data ?? []).map((r: any) => {
        const i = snakeToCamel(r) as any
        return {
          id: i.id, invoiceId, itemKind: i.metadata?.itemKind ?? 'other',
          description: i.name ?? '', quantity: i.quantity ?? 1,
          unitPrice: i.unitPrice ?? 0, totalAmount: i.total ?? 0,
          discount: i.discount ?? 0, surcharge: 0,
          referenceId: i.productId ?? i.serviceId,
          accountId: i.metadata?.accountId,
          costCenterId: i.metadata?.costCenterId,
          createdAt: i.createdAt,
        } as InvoiceItem
      })
    },

    async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
      const { core, pub } = getClients()
      const tenantId = getTenantId()
      const kind = input.direction === 'debit' ? 'invoice_payable' : 'invoice_receivable'
      const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice - (item.discount ?? 0) + (item.surcharge ?? 0), 0)
      const itemsSummary = input.items.map((i: any) => i.description).filter(Boolean).join(', ')

      // Auto-generate reference number if not provided
      let referenceNumber = input.fiscalNumber
      if (!referenceNumber && tenantId) {
        const prefix = input.direction === 'credit' ? 'REC' : 'PAG'
        const { data: seq } = await core.rpc('next_sequence', { p_tenant_id: tenantId, p_kind: kind })
        if (seq) referenceNumber = `${prefix}-${String(seq).padStart(5, '0')}`
      }

      const { data: order } = await core.from('orders').insert({
        tenant_id: tenantId, kind, status: 'open',
        stage: 'invoiced',
        direction: input.direction,
        reference_number: referenceNumber,
        total: totalAmount, party_id: input.contactId,
        notes: input.observations,
        currency: 'BRL',
        metadata: { itemsSummary, contactName: input.contactName, installmentCount: input.installments.length || 1 },
      }).select().single()

      if (order && input.items.length > 0) {
        await core.from('order_items').insert(
          input.items.map((item, i) => ({
            order_id: order.id, name: item.description,
            quantity: item.quantity, unit_price: item.unitPrice,
            discount: item.discount ?? 0,
            total: item.quantity * item.unitPrice - (item.discount ?? 0) + (item.surcharge ?? 0),
            sort_order: i,
            metadata: {
              itemKind: item.itemKind,
              referenceId: item.referenceId,
              accountId: item.accountId,
              costCenterId: item.costCenterId,
            },
          }))
        )
      }

      // Create installment movements
      if (order && input.installments.length > 0) {
        await pub.from(T.movements).insert(
          input.installments.map((inst, i) => ({
            tenant_id: tenantId, invoice_id: order.id,
            direction: input.direction, movement_kind: inst.movementKind,
            amount: inst.amount, paid_amount: 0, status: 'pending',
            due_date: inst.dueDate, installment_number: inst.installmentNumber ?? i + 1,
          }))
        )
      }

      return {
        id: order!.id, direction: input.direction, invoiceDate: new Date().toISOString().slice(0, 10),
        fiscalNumber: referenceNumber,
        totalAmount, paidAmount: 0, status: 'open', totalInstallments: input.installments.length || 1,
        contactName: input.contactName, itemsSummary,
        tenantId: tenantId!, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      } as Invoice
    },

    async updateInvoice(id: string, partial: Partial<Invoice>): Promise<Invoice> {
      const { core, pub } = getClients()
      const row: any = {}
      if (partial.observations) row.notes = partial.observations
      if (partial.totalAmount) row.total = partial.totalAmount
      if (partial.status) row.status = partial.status
      if (Object.keys(row).length > 0) await core.from('orders').update(row).eq('id', id)
      return (await provider.getInvoiceById(id))!
    },

    async cancelInvoice(id: string): Promise<void> {
      const { core, pub } = getClients()
      await core.from('orders').update({ status: 'cancelled' }).eq('id', id)
      await pub.from(T.movements).update({ status: 'cancelled' }).eq('invoice_id', id).eq('status', 'pending')
    },

    // --- Movements (public.financial_movements) ---
    async getMovements(query: MovementQuery): Promise<PaginatedResult<FinancialMovement>> {
      const { core, pub } = getClients()
      let qb = pub.from(T.movements).select('*', { count: 'exact' })
      if (query.direction) qb = qb.eq('direction', query.direction)
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        qb = qb.in('status', statuses)
      }
      if (query.bankAccountId) qb = qb.eq('bank_account_id', query.bankAccountId)
      if (query.cashSessionId) qb = qb.eq('cash_session_id', query.cashSessionId)
      if (query.dateRange) qb = qb.gte('due_date', query.dateRange.from).lte('due_date', query.dateRange.to)
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('due_date')
      const { data, count } = await qb
      return { data: (data ?? []).map((r: any) => snakeToCamel(r) as unknown as FinancialMovement), total: count ?? 0 }
    },

    async payMovement(input: PayMovementInput): Promise<FinancialMovement> {
      const { core, pub } = getClients()
      const { data: mov } = await pub.from(T.movements).select('*').eq('id', input.movementId).single()
      if (!mov) throw new Error('Movement not found')
      const tenantId = mov.tenant_id ?? getTenantId()

      // Net card settlement: derive the processing/MDR fee (inflows only in v1).
      const feePct = mov.direction === 'credit' ? await getMethodFeePct(pub, input.paymentMethodId) : 0
      const thisFee = round2(input.amount * (feePct / 100))

      // 1. Record the cash event as its OWN payment movement — NOT by mutating the
      //    bill. Two payments on one installment → two distinct rows in the extract.
      const paymentRow: any = {
        tenant_id: tenantId,
        invoice_id: mov.invoice_id,
        direction: mov.direction,
        movement_kind: 'payment',
        amount: input.amount,
        paid_amount: input.amount,
        fee_amount: thisFee,
        status: 'paid',
        due_date: mov.due_date,
        payment_date: input.paymentDate,
        installment_number: mov.installment_number,
        payment_method_id: input.paymentMethodId ?? null,
        payment_method_type_id: input.paymentMethodTypeId ?? null,
        bank_account_id: input.bankAccountId ?? null,
        cash_session_id: input.cashSessionId ?? null,
        card_brand: input.cardBrand ?? null,
        card_installments: input.cardInstallments ?? null,
        notes: input.notes ?? null,
      }
      let { data, error } = await pub.from(T.movements).insert(paymentRow).select().single()
      // Graceful fallback if the fee_amount migration hasn't been applied yet.
      if (error && /fee_amount/i.test(error.message ?? '')) {
        const { fee_amount, ...rest } = paymentRow
        ;({ data, error } = await pub.from(T.movements).insert(rest).select().single())
      }
      if (error) throw error

      // 2. Update the bill (obligation) cache: cumulative paid + status. It stays a
      //    pure obligation (no bank/method/date) — the cash lives on the payment row.
      //    v_invoice_balances reads bill.paid_amount, so this keeps balances correct.
      const newPaid = round2((mov.paid_amount ?? 0) + input.amount)
      const billStatus = newPaid >= mov.amount ? 'paid' : 'partial'
      // Clear the bill's cash fields so it stops being a cash event (the payment row is now
      // the cash event) — prevents double-counting legacy in-place-paid bills.
      await pub.from(T.movements)
        .update({ paid_amount: newPaid, status: billStatus, payment_date: null, bank_account_id: null })
        .eq('id', mov.id)

      // 3. Update invoice (order) status based on its bills
      if (mov.invoice_id) {
        const { data: allMovs } = await pub.from(T.movements)
          .select('status, amount, paid_amount')
          .eq('invoice_id', mov.invoice_id)
          .eq('movement_kind', 'bill')
        const movs = allMovs ?? []
        const allPaid = movs.length > 0 && movs.every((m: any) => m.status === 'paid')
        const anyPaid = movs.some((m: any) => m.status === 'paid' || m.status === 'partial')
        const invoiceStatus = allPaid ? 'paid' : anyPaid ? 'partial' : 'open'
        const totalPaid = movs.reduce((sum: number, m: any) => sum + (m.paid_amount ?? 0), 0)
        // Store paid amount in metadata (orders table has no dedicated paid column)
        const { data: order } = await core.from('orders').select('metadata').eq('id', mov.invoice_id).single()
        const meta = (order?.metadata as any) ?? {}
        const invoiceStage = allPaid ? 'paid' : anyPaid ? 'partial' : 'invoiced'
        // Only update financial order status. Agenda status lives on public.appointments.
        await core.from('orders').update({
          status: invoiceStage,
          metadata: { ...meta, paidAmount: totalPaid },
        }).eq('id', mov.invoice_id)
      }

      return snakeToCamel(data!) as unknown as FinancialMovement
    },

    async cancelMovement(id: string): Promise<void> {
      const { core, pub } = getClients()
      await pub.from(T.movements).update({ status: 'cancelled' }).eq('id', id)
    },

    // --- Transfers (between accounts) ---
    async createTransfer(input: CreateTransferInput): Promise<TransferResult> {
      const { pub } = getClients()
      if (!input.fromAccountId || !input.toAccountId || input.fromAccountId === input.toAccountId) {
        throw new Error('Source and destination accounts must differ')
      }
      if (!(input.amount > 0)) throw new Error('Amount must be greater than zero')
      const tenantId = getTenantId()
      const transferId = genId()
      const base = {
        tenant_id: tenantId,
        movement_kind: 'transfer' as const,
        amount: input.amount,
        paid_amount: input.amount,
        fee_amount: 0,
        status: 'paid' as const,
        due_date: input.date,
        payment_date: input.date,
        notes: input.notes ?? null,
      }
      const rowsToInsert = [
        {
          ...base,
          direction: 'debit',
          bank_account_id: input.fromAccountId,
          metadata: { transferId, transferRole: 'out', counterAccountId: input.toAccountId },
        },
        {
          ...base,
          direction: 'credit',
          bank_account_id: input.toAccountId,
          metadata: { transferId, transferRole: 'in', counterAccountId: input.fromAccountId },
        },
      ]
      let { data, error } = await pub.from(T.movements).insert(rowsToInsert).select('id, direction')
      // Graceful fallback if the fee_amount migration hasn't been applied yet.
      if (error && /fee_amount/i.test(error.message ?? '')) {
        const stripped = rowsToInsert.map(({ fee_amount, ...rest }) => rest)
        ;({ data, error } = await pub.from(T.movements).insert(stripped).select('id, direction'))
      }
      if (error) throw error
      const rows = (data ?? []) as Array<{ id: string; direction: string }>
      const debitMovementId = rows.find((r) => r.direction === 'debit')?.id ?? ''
      const creditMovementId = rows.find((r) => r.direction === 'credit')?.id ?? ''
      return { transferId, debitMovementId, creditMovementId }
    },

    // --- Bank Accounts ---
    async getBankAccounts(): Promise<BankAccount[]> {
      const { core, pub } = getClients()
      const { data } = await pub.from(T.bankAccounts).select('*').eq('is_active', true).order('name')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as BankAccount)
    },

    async createBankAccount(input: CreateBankAccountInput): Promise<BankAccount> {
      const { core, pub } = getClients()
      const tenantId = getTenantId()
      const { data } = await pub.from(T.bankAccounts).insert({
        ...camelToSnake(input as any), tenant_id: tenantId, current_balance: input.initialBalance ?? 0,
      }).select().single()
      return snakeToCamel(data!) as unknown as BankAccount
    },

    async updateBankAccount(id: string, partial: Partial<BankAccount>): Promise<BankAccount> {
      const { core, pub } = getClients()
      const row = camelToSnake(partial as any)
      delete row.id; delete row.tenant_id
      const { data } = await pub.from(T.bankAccounts).update(row).eq('id', id).select().single()
      return snakeToCamel(data!) as unknown as BankAccount
    },

    // --- Cash Sessions ---
    async getCashSessions(bankAccountId?: string): Promise<CashSession[]> {
      const { core, pub } = getClients()
      let qb = pub.from(T.cashRegisterSessions).select('*')
      if (bankAccountId) qb = qb.eq('bank_account_id', bankAccountId)
      const { data } = await qb.order('opened_at', { ascending: false })
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as CashSession)
    },

    async getOpenSession(bankAccountId: string): Promise<CashSession | null> {
      const { core, pub } = getClients()
      const { data } = await pub.from(T.cashRegisterSessions).select('*').eq('bank_account_id', bankAccountId).eq('status', 'open').single()
      return data ? snakeToCamel(data) as unknown as CashSession : null
    },

    async openCashSession(input: OpenCashSessionInput): Promise<CashSession> {
      const { core, pub } = getClients()
      const tenantId = getTenantId()
      const { data } = await pub.from(T.cashRegisterSessions).insert({
        tenant_id: tenantId, bank_account_id: input.bankAccountId,
        status: 'open', opening_balance: input.openingBalance,
        opened_by_user_id: input.openedByUserId, opened_by_name: input.openedByName,
        unit_id: input.unitId,
      }).select().single()
      return snakeToCamel(data!) as unknown as CashSession
    },

    async closeCashSession(input: CloseCashSessionInput): Promise<CashSession> {
      const { core, pub } = getClients()
      const { data } = await pub.from(T.cashRegisterSessions).update({
        status: 'closed', closing_balance: input.closingBalance,
        closed_at: new Date().toISOString(),
        closed_by_user_id: input.closedByUserId, closed_by_name: input.closedByName,
        notes: input.notes,
      }).eq('id', input.sessionId).select().single()
      return snakeToCamel(data!) as unknown as CashSession
    },

    async getCashSessionSummary(sessionId: string): Promise<CashSessionSummary> {
      const { core, pub } = getClients()
      const session = (await pub.from(T.cashRegisterSessions).select('*').eq('id', sessionId).single()).data
      const { data: movs } = await pub.from(T.movements).select('direction, paid_amount').eq('cash_session_id', sessionId).eq('status', 'paid')
      const movements = movs ?? []
      return {
        session: snakeToCamel(session!) as unknown as CashSession,
        movementCount: movements.length,
        totalInflow: movements.filter((m: any) => m.direction === 'credit').reduce((s: number, m: any) => s + m.paid_amount, 0),
        totalOutflow: movements.filter((m: any) => m.direction === 'debit').reduce((s: number, m: any) => s + m.paid_amount, 0),
      }
    },

    // --- Payment Methods ---
    async getPaymentMethods(): Promise<PaymentMethod[]> {
      const { core, pub } = getClients()
      const { data } = await pub.from(T.paymentMethods).select('*').eq('is_active', true).order('name')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as PaymentMethod)
    },

    async getPaymentMethodTypes(): Promise<PaymentMethodType[]> {
      const { core, pub } = getClients()
      const { data } = await pub.from(T.paymentMethodTypes).select('*').eq('is_active', true).order('name')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as PaymentMethodType)
    },

    // --- Chart of Accounts ---
    async getChartOfAccounts(): Promise<ChartOfAccountsNode[]> {
      const { core, pub } = getClients()
      const { data } = await pub.from(T.chartOfAccounts).select('*').eq('is_active', true).order('code')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as ChartOfAccountsNode)
    },

    async getCostCenters(): Promise<CostCenter[]> {
      const { core, pub } = getClients()
      const { data } = await pub.from(T.costCenters).select('*').eq('is_active', true).order('code')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as CostCenter)
    },

    // --- Card Transactions ---
    async getCardTransactions(dateRange?: DateRange): Promise<CardTransaction[]> {
      const { core, pub } = getClients()
      return [] // TODO: implement when card_transactions table exists
    },

    // --- Statements (ERP extract: opening balance + realized cash + per-row net/fee) ---
    async getStatement(query: StatementQuery): Promise<StatementResult> {
      const { core, pub } = getClients()
      const today = new Date().toISOString().slice(0, 10)
      // The extract = actual cash events. A cash event is any non-cancelled movement with
      // a payment_date: payment movements, transfers, and legacy in-place-paid bills (which
      // still carry a payment_date until the split migration backfills them). Once a payment
      // movement exists for a bill, payMovement clears the bill's payment_date, so a single
      // cash amount is represented by exactly one row — no double counting, no migration needed.

      // 1. Resolve in-scope accounts. No bankAccountId => consolidated: ALL realized cash
      // (including movements with no bank_account_id, e.g. cash/card payments not tied to an account).
      const { data: acctRows } = await pub.from(T.bankAccounts).select('id, name, initial_balance, is_active')
      const allAccounts = (acctRows ?? []) as any[]
      const consolidated = !query.bankAccountId
      const scopeAccounts = consolidated
        ? allAccounts.filter((a) => a.is_active)
        : allAccounts.filter((a) => a.id === query.bankAccountId)
      const accountIds = scopeAccounts.map((a) => a.id)
      const accountNameById = new Map<string, string>(allAccounts.map((a) => [a.id, a.name]))
      const initialSum = scopeAccounts.reduce((s, a) => s + (Number(a.initial_balance) || 0), 0)
      // Only bail when a specific account was asked for and not found.
      if (!consolidated && accountIds.length === 0) {
        return { entries: [], openingBalance: 0, closingBalance: 0, totalCredits: 0, totalDebits: 0, totalFees: 0, net: 0, accountId: query.bankAccountId }
      }
      // Consolidated => no account filter (catches NULL-account movements too).
      const scopeFilter = (qb: any) => consolidated ? qb : qb.in('bank_account_id', accountIds)

      const netOf = (r: any) => r.direction === 'credit'
        ? (Number(r.paid_amount) || 0) - (Number(r.fee_amount) || 0)
        : -(Number(r.paid_amount) || 0)

      // 2. Opening balance = Σ initial_balance + prior net (payment_date < from).
      // Select '*' so this still works before the fee_amount migration lands (fee → 0).
      const { data: priorRows } = await scopeFilter(pub.from(T.movements)
        .select('*')
        .neq('status', 'cancelled')
        .lt('payment_date', query.dateRange.from))
      const priorNet = (priorRows ?? []).reduce((s: number, r: any) => s + netOf(r), 0)
      const openingBalance = round2(initialSum + priorNet)

      // 3. In-range realized rows.
      const { data: movs } = await scopeFilter(pub.from(T.movements)
        .select('*')
        .neq('status', 'cancelled')
        .gte('payment_date', query.dateRange.from).lte('payment_date', query.dateRange.to)
        .order('payment_date').order('created_at'))

      // 4. Join invoices for descriptions.
      const invoiceIds = [...new Set((movs ?? []).map((r: any) => r.invoice_id).filter(Boolean))]
      const invoiceById = new Map<string, Invoice>()
      if (invoiceIds.length) {
        const { data: orders } = await core.from('orders').select('id, party_id, reference_number, metadata').in('id', invoiceIds)
        for (const o of (orders ?? []) as any[]) {
          invoiceById.set(o.id, { id: o.id, contactId: o.party_id, contactName: (o.metadata as any)?.contactName, fiscalNumber: o.reference_number } as Invoice)
        }
      }

      // 5. Build entries with running NET balance.
      let balance = openingBalance
      let totalCredits = 0, totalDebits = 0, totalFees = 0
      const entries: StatementEntry[] = (movs ?? []).map((r: any) => {
        const movement = snakeToCamel(r) as unknown as FinancialMovement
        const gross = Number(r.paid_amount) || 0
        const isCredit = r.direction === 'credit'
        const fee = isCredit ? (Number(r.fee_amount) || 0) : 0
        const net = isCredit ? round2(gross - fee) : gross
        const meta = (r.metadata ?? {}) as any
        const isTransfer = r.movement_kind === 'transfer'
        const entryKind: StatementEntry['entryKind'] = isTransfer
          ? (meta.transferRole === 'in' ? 'transfer-in' : 'transfer-out')
          : 'movement'
        const counterAccountId = isTransfer ? meta.counterAccountId : undefined
        if (isCredit) balance = round2(balance + net)
        else balance = round2(balance - net)
        // Exclude internal transfers from consolidated totals (they net to zero across accounts).
        if (!(consolidated && isTransfer)) {
          if (isCredit) totalCredits = round2(totalCredits + net)
          else totalDebits = round2(totalDebits + net)
          totalFees = round2(totalFees + fee)
        }
        return {
          movement,
          invoice: r.invoice_id ? invoiceById.get(r.invoice_id) : undefined,
          runningBalance: balance,
          gross, fee, net, entryKind,
          counterAccountId,
          counterAccountName: counterAccountId ? accountNameById.get(counterAccountId) : undefined,
        }
      })

      // 5b. Resolve the reconciliation counterpart for matched bank lines, so the
      // extract row can link to the internal transaction it was conciliated with.
      const matchedIds = [...new Set(entries.map((e) => e.movement.matchedMovementId).filter(Boolean))] as string[]
      if (matchedIds.length) {
        const { data: matched } = await pub.from(T.movements).select('id, invoice_id, notes').in('id', matchedIds)
        const matchedById = new Map<string, any>((matched ?? []).map((m: any) => [m.id, m]))
        const matchedInvoiceIds = [...new Set((matched ?? []).map((m: any) => m.invoice_id).filter(Boolean))] as string[]
        const invById = new Map<string, any>()
        if (matchedInvoiceIds.length) {
          const { data: orders } = await core.from('orders').select('id, reference_number, metadata').in('id', matchedInvoiceIds)
          for (const o of (orders ?? []) as any[]) invById.set(o.id, o)
        }
        for (const e of entries) {
          const mid = e.movement.matchedMovementId
          const mm = mid ? matchedById.get(mid) : undefined
          if (!mm) continue
          const inv = mm.invoice_id ? invById.get(mm.invoice_id) : undefined
          e.reconciledWith = {
            movementId: mm.id,
            description: mm.notes ?? undefined,
            invoiceId: mm.invoice_id ?? undefined,
            fiscalNumber: inv?.reference_number ?? undefined,
            contactName: (inv?.metadata as any)?.contactName ?? undefined,
          }
        }
      }

      // 6. Account current balance (ledger as-of-today).
      const { data: todayRows } = await scopeFilter(pub.from(T.movements)
        .select('*')
        .neq('status', 'cancelled')
        .lte('payment_date', today))
      const accountCurrentBalance = round2(initialSum + (todayRows ?? []).reduce((s: number, r: any) => s + netOf(r), 0))

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
    async getSummary(dateRange?: DateRange): Promise<FinancialSummary> {
      // Sweep overdue on first load (background, non-blocking)
      sweepOverdue()
      const { core, pub } = getClients()
      const { data: accounts } = await pub.from(T.bankAccounts).select('current_balance').eq('is_active', true)
      const totalBalance = (accounts ?? []).reduce((s: number, a: any) => s + (a.current_balance ?? 0), 0)

      const { data: movs } = await pub.from(T.movements).select('direction, movement_kind, amount, paid_amount, status, due_date, payment_date')
      const allMovs = movs ?? []
      const unpaid = allMovs.filter((m: any) => ['pending', 'partial', 'overdue'].includes(m.status))
      const today = new Date().toISOString().slice(0, 10)

      const unpaidCredit = unpaid.filter((m: any) => m.direction === 'credit')
      const unpaidDebit = unpaid.filter((m: any) => m.direction === 'debit')
      const overdueCredit = unpaidCredit.filter((m: any) => m.status === 'overdue' || m.due_date < today)
      const overdueDebit = unpaidDebit.filter((m: any) => m.status === 'overdue' || m.due_date < today)

      // Monthly cash flow = a trailing 30-day rolling window (not calendar
      // month-to-date, which reads empty in the first days of a month).
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const monthStart = monthAgo.toISOString().slice(0, 10)
      // Monthly cash flow = payment cash events (one row per payment), never bills.
      const monthPaid = allMovs.filter((m: any) => m.movement_kind === 'payment' && m.payment_date >= monthStart)

      return {
        totalBalance,
        totalReceivable: unpaidCredit.reduce((s: number, m: any) => s + m.amount - m.paid_amount, 0),
        totalPayable: unpaidDebit.reduce((s: number, m: any) => s + m.amount - m.paid_amount, 0),
        monthlyInflow: monthPaid.filter((m: any) => m.direction === 'credit').reduce((s: number, m: any) => s + m.paid_amount, 0),
        monthlyOutflow: monthPaid.filter((m: any) => m.direction === 'debit').reduce((s: number, m: any) => s + m.paid_amount, 0),
        overdueReceivableCount: overdueCredit.length,
        overdueReceivableAmount: overdueCredit.reduce((s: number, m: any) => s + m.amount - m.paid_amount, 0),
        overduePayableCount: overdueDebit.length,
        overduePayableAmount: overdueDebit.reduce((s: number, m: any) => s + m.amount - m.paid_amount, 0),
      }
    },

    // --- Reconciliation (conciliação) ---
    // Imported bank-statement lines live in financial_movements tagged with
    // (external_source, external_id), status='paid'. Reconciling links a line
    // to the internal movement it settles (or accepts it standalone).
    async importBankTransactions(input) {
      const { pub } = getClients()
      const tenantId = getTenantId()
      let imported = 0, duplicates = 0
      for (const line of input.lines) {
        const { error } = await pub.from(T.movements).insert({
          tenant_id: tenantId,
          direction: line.direction,
          movement_kind: 'payment',
          amount: line.amount,
          paid_amount: line.amount,
          status: 'paid',
          due_date: line.date,
          payment_date: line.date,
          bank_account_id: line.bankAccountId ?? input.bankAccountId ?? null,
          notes: line.description,
          external_id: line.externalId,
          external_source: line.externalSource,
        })
        if (error) {
          // 23505 = unique violation on uq_financial_movements_external → already imported.
          if ((error as any).code === '23505') duplicates++
          else throw error
        } else imported++
      }
      return { imported, duplicates }
    },

    async getUnreconciled(query) {
      const { pub } = getClients()
      let qb = pub.from(T.movements).select('*')
        .not('external_source', 'is', null)
        .is('reconciled_at', null)
      if (query?.bankAccountId) qb = qb.eq('bank_account_id', query.bankAccountId)
      if (query?.dateRange) qb = qb.gte('payment_date', query.dateRange.from).lte('payment_date', query.dateRange.to)
      const { data } = await qb.order('payment_date', { ascending: false })
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as FinancialMovement)
    },

    async suggestReconciliation(bankMovementId) {
      const { core, pub } = getClients()
      const { data: line } = await pub.from(T.movements).select('*').eq('id', bankMovementId).single()
      if (!line) return []
      const amount = Number(line.amount) || 0
      const lineDate = line.payment_date ?? line.due_date
      // Candidates: app-native (non-imported), same direction, not reconciled, amount within ±2%.
      const tol = Math.max(0.01, round2(amount * 0.02))
      const { data } = await pub.from(T.movements).select('*')
        .is('external_source', null)
        .is('reconciled_at', null)
        .eq('direction', line.direction)
        .gte('amount', round2(amount - tol))
        .lte('amount', round2(amount + tol))
        .neq('id', bankMovementId)
        .limit(25)
      const candidates = ((data ?? []) as any[]).map((r) => {
        const amtDiff = Math.abs((Number(r.amount) || 0) - amount)
        const amtScore = amount > 0 ? Math.max(0, 1 - amtDiff / amount) : 0
        const refDate = r.due_date ?? r.payment_date
        const days = lineDate && refDate
          ? Math.abs((new Date(lineDate).getTime() - new Date(refDate).getTime()) / 86400000)
          : 30
        const dateScore = Math.max(0, 1 - days / 30)
        return {
          movement: snakeToCamel(r) as unknown as FinancialMovement,
          score: round2(0.7 * amtScore + 0.3 * dateScore),
        } as ReconciliationCandidate
      }).sort((a, b) => b.score - a.score)
      // Attach invoice contact names for display.
      const invoiceIds = [...new Set(candidates.map((c) => c.movement.invoiceId).filter(Boolean))] as string[]
      if (invoiceIds.length) {
        const { data: orders } = await core.from('orders').select('id, reference_number, metadata').in('id', invoiceIds)
        const byId = new Map<string, any>((orders ?? []).map((o: any) => [o.id, o]))
        for (const c of candidates) {
          const o = c.movement.invoiceId ? byId.get(c.movement.invoiceId) : undefined
          if (o) c.invoice = { id: o.id, contactName: (o.metadata as any)?.contactName, fiscalNumber: o.reference_number } as Invoice
        }
      }
      return candidates
    },

    async reconcileMovement(input) {
      const { pub } = getClients()
      const now = new Date().toISOString()
      await pub.from(T.movements).update({
        reconciled_at: now,
        matched_movement_id: input.matchedMovementId ?? null,
      }).eq('id', input.bankMovementId)
      if (input.matchedMovementId) {
        // The internal movement is now settled+reconciled by the bank line.
        await pub.from(T.movements).update({ reconciled_at: now }).eq('id', input.matchedMovementId)
      }
    },

    async unreconcileMovement(bankMovementId) {
      const { pub } = getClients()
      const { data: line } = await pub.from(T.movements).select('matched_movement_id').eq('id', bankMovementId).single()
      await pub.from(T.movements).update({ reconciled_at: null, matched_movement_id: null }).eq('id', bankMovementId)
      if (line?.matched_movement_id) {
        await pub.from(T.movements).update({ reconciled_at: null }).eq('id', line.matched_movement_id)
      }
    },
  }

  return provider
}
