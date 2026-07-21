// ---------------------------------------------------------------------------
// Factory: creates a ClientOrdersProvider that queries public.orders
// for a given client (party_id). The UI keeps the historical "stage" language,
// but current archetype schemas expose this lifecycle as orders.status.
// ---------------------------------------------------------------------------

import type { ClientOrdersProvider, ClientOrdersQuery, ClientDocument, ClientDocumentStage } from '../types/client-orders'
import { getSupabaseClientOptional } from './supabase'

const STAGE_FILTER_MAP: Record<string, string[]> = {
  quoted: ['draft', 'quoted'],
  booked: ['booked', 'scheduled', 'confirmed', 'in_progress', 'completed'],
  invoiced: ['invoiced', 'partial', 'overdue'],
  paid: ['paid'],
}

/**
 * A shop order's lifecycle is not in `status` (open/archived/cancelled) but in
 * the payment state the shop plugin mirrors into metadata. Without this every
 * storefront purchase showed up as "rascunho" on the customer's record — the
 * same tab, the same table, but reading the wrong column for that kind.
 */
function mapShopOrderToStage(row: { status?: string | null; metadata?: Record<string, unknown> | null }): ClientDocumentStage {
  if (row.status === 'cancelled') return 'cancelled'
  switch (String(row.metadata?.financial_status ?? '')) {
    case 'paid': return 'paid'
    case 'partially_refunded': return 'partial'
    case 'refunded':
    case 'voided': return 'cancelled'
    default: return 'invoiced'   // placed, awaiting payment
  }
}

function mapOrderStatusToStage(status: string | null | undefined): ClientDocumentStage {
  switch (status) {
    case 'scheduled':
    case 'confirmed':
    case 'in_progress':
      return 'booked'
    case 'completed':
      return 'completed'
    case 'invoiced':
    case 'paid':
    case 'partial':
    case 'overdue':
    case 'cancelled':
    case 'no_show':
    case 'quoted':
    case 'draft':
      return status
    default:
      return 'draft'
  }
}

export function createClientOrdersProvider(): ClientOrdersProvider {
  return {
    async getDocuments(query: ClientOrdersQuery): Promise<{ data: ClientDocument[]; total: number }> {
      const supabase = getSupabaseClientOptional()
      if (!supabase) return { data: [], total: 0 }

      try {
        let qb = supabase
          .from('orders')
          .select('id, kind, status, total, reference_number, notes, metadata, created_at', { count: 'exact' })
          .eq('party_id', query.clientId)

        // Filter by stage groups against the current schema's status column.
        if (query.stages && query.stages.length > 0) {
          const allStages = query.stages.flatMap((s) => STAGE_FILTER_MAP[s] ?? [s])
          qb = qb.in('status', allStages)
        }

        qb = qb.order('created_at', { ascending: false })

        const page = query.page ?? 1
        const pageSize = query.pageSize ?? 50
        qb = qb.range((page - 1) * pageSize, page * pageSize - 1)

        const { data, count } = await qb
        const orderIds = (data ?? []).map((row: any) => row.id).filter(Boolean)

        const bookingStartsByOrderId = new Map<string, string>()
        if (orderIds.length > 0) {
          const { data: bookings } = await supabase
            .from('appointments')
            .select('order_id, starts_at')
            .in('order_id', orderIds)

          for (const booking of bookings ?? []) {
            if (booking.order_id && booking.starts_at && !bookingStartsByOrderId.has(booking.order_id)) {
              bookingStartsByOrderId.set(booking.order_id, booking.starts_at)
            }
          }
        }

        const results: ClientDocument[] = (data ?? []).map((row: any) => {
          const meta = (row.metadata ?? {}) as Record<string, unknown>
          const startsAt = bookingStartsByOrderId.get(row.id)
          return {
            id: row.id,
            kind: row.kind as string,
            stage: row.kind === 'shop'
              ? mapShopOrderToStage(row)
              : mapOrderStatusToStage(row.status as string | null | undefined),
            referenceNumber: row.reference_number ?? undefined,
            date: startsAt?.slice(0, 10) ?? (row.created_at as string)?.slice(0, 10) ?? '',
            startsAt,
            total: Number(row.total) || 0,
            // A paid shop order has no separate paidAmount; the total is what
            // was settled.
            paidAmount: Number(meta.paidAmount)
              || (row.kind === 'shop' && meta.financial_status === 'paid' ? Number(row.total) || 0 : 0),
            description: (meta.itemsSummary as string) ?? (meta.serviceNames as string) ?? row.notes ?? undefined,
            createdAt: row.created_at as string,
          }
        })

        return { data: results, total: count ?? results.length }
      } catch {
        return { data: [], total: 0 }
      }
    },
  }
}
