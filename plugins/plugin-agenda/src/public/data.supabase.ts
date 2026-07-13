// ---------------------------------------------------------------------------
// Supabase implementation of PublicBookingDataProvider — anon-safe.
//
// Public booking pages run with the publishable (anon) key and NO user session,
// so the canonical tenant RLS (`tenant_id IN user_tenant_ids()`) yields nothing.
// This provider therefore only touches objects designed for anon access:
//   - public.v_public_services   (column-whitelisted view of active services)
//   - public.get_available_slots (SECURITY DEFINER RPC, mirrors the mock algo)
//   - public.create_public_booking (SECURITY DEFINER RPC: validates the slot,
//     upserts the customer person, writes order+booking+order_item atomically)
// Shipped by plugins/plugin-agenda/src/migrations/001_public_booking.sql.
// ---------------------------------------------------------------------------

import { getSupabaseClientOptional } from '@fayz-ai/core'
import type { TimeSlot } from '../types'
import type { PublicService } from './types'
import type { PublicBookingDataProvider } from './data'

export interface SupabasePublicBookingOptions {
  /** The tenant this public page books against (RPC arg — required). */
  tenantId: string
}

interface SupabaseLikeClient {
  from(table: string): any
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

function getClient(): SupabaseLikeClient {
  const client = getSupabaseClientOptional() as SupabaseLikeClient | null
  if (!client) throw new Error('[plugin-agenda/public] Supabase client not initialized')
  return client
}

/** Digits-only phone (RPC normalizes again server-side; keep the dial code). */
function toPhoneDigits(phone: string | undefined): string {
  return (phone ?? '').replace(/\D/g, '')
}

export function createSupabasePublicBookingProvider(options: SupabasePublicBookingOptions): PublicBookingDataProvider {
  const { tenantId } = options

  return {
    async getServices(): Promise<PublicService[]> {
      const { data, error } = await getClient()
        .from('v_public_services')
        .select('id, name, description, price, currency, duration_minutes, sort_order')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })
      if (error) throw new Error(`[plugin-agenda/public] getServices: ${error.message}`)
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        description: (row.description as string | null) ?? undefined,
        price: Number(row.price ?? 0),
        durationMinutes: Number(row.duration_minutes ?? 30),
      }))
    },

    async getAvailableSlots(query): Promise<TimeSlot[]> {
      const { data, error } = await getClient().rpc('get_available_slots', {
        p_tenant_id: tenantId,
        p_assignee_id: query.assigneeId,
        p_date: query.date,
        p_duration_minutes: query.durationMinutes,
        p_slot_interval: query.slotInterval,
      })
      if (error) throw new Error(`[plugin-agenda/public] getAvailableSlots: ${error.message}`)
      return ((data ?? []) as Array<{ slot_start: string; slot_end: string }>).map((row) => ({
        start: row.slot_start,
        end: row.slot_end,
      }))
    },

    async createBooking(input) {
      const phone = toPhoneDigits(input.contact.phone)
      const { data, error } = await getClient().rpc('create_public_booking', {
        p_tenant_id: tenantId,
        p_service_id: input.serviceId,
        p_starts_at: input.startsAt,
        p_name: input.contact.name.trim(),
        p_phone: phone,
        p_email: input.contact.email?.trim() || null,
        p_notes: input.contact.notes?.trim() || null,
      })
      if (error) throw new Error(`[plugin-agenda/public] createBooking: ${error.message}`)
      const row = (Array.isArray(data) ? data[0] : data) as
        | { booking_id: string; starts_at: string; ends_at: string }
        | undefined
      if (!row) throw new Error('[plugin-agenda/public] createBooking: empty RPC response')
      return { bookingId: row.booking_id, startsAt: row.starts_at, endsAt: row.ends_at }
    },
  }
}
