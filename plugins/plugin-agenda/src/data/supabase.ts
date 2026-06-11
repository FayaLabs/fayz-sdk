import type { AgendaDataProvider } from './types'
import type {
  CalendarBooking, Professional, Schedule, TimeSlot,
  CreateBookingInput, UpdateBookingInput, SaveScheduleInput,
  BookingQuery, ConflictCheckParams, AvailableSlotsParams, BookingStatus,
} from '../types'
import { getSupabaseClientOptional } from '@fayz/core'
import { getAgendaTenantId } from '../lib/tenant'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTenantId(): string | undefined {
  return getAgendaTenantId()
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value
  }
  return result
}

function getClients() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return { core: supabase.schema('saas_core'), pub: supabase }
}

function mapBooking(row: Record<string, unknown>): CalendarBooking {
  return snakeToCamel(row) as unknown as CalendarBooking
}

function mapSchedule(row: Record<string, unknown>): Schedule {
  return snakeToCamel(row) as unknown as Schedule
}

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Supabase Agenda Provider
// ---------------------------------------------------------------------------

export function createSupabaseAgendaProvider(): AgendaDataProvider {
  return {
    // v_bookings is in public schema (PostgREST default)
    async getBookings(query: BookingQuery): Promise<CalendarBooking[]> {
      const { pub } = getClients()
      let q = pub.from('v_bookings').select('*')
        .gte('starts_at', query.dateRange.start)
        .lte('starts_at', query.dateRange.end)

      if (query.kind) q = q.eq('kind', query.kind)
      if (query.statuses?.length) q = q.in('status', query.statuses)
      if (query.professionalIds?.length) q = q.in('professional_id', query.professionalIds)
      if (query.locationId) q = q.eq('location_id', query.locationId)

      q = q.order('starts_at', { ascending: true })

      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapBooking)
    },

    async getBookingById(id: string): Promise<CalendarBooking | null> {
      const { pub } = getClients()
      const { data, error } = await pub.from('v_bookings').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? mapBooking(data as Record<string, unknown>) : null
    },

    async createBooking(input: CreateBookingInput): Promise<CalendarBooking> {
      const { core } = getClients()
      const tenantId = getTenantId()
      if (!tenantId) throw new Error('No active tenant')

      const hasServices = input.services.length > 0
      const totalDuration = input.services.reduce((sum, s) => sum + s.durationMinutes, 0)
      const totalPrice = input.services.reduce((sum, s) => sum + s.price, 0)
      const endsAt = addMinutes(input.startsAt, totalDuration || 30)
      const serviceNames = input.services.map((s: any) => s.name).join(', ')

      // Resolve client name for metadata (used by financial detail view)
      let contactName: string | undefined
      if (input.clientId) {
        const { data: person } = await core.from('persons').select('name').eq('id', input.clientId).single()
        contactName = person?.name as string | undefined
      }

      // Single order row — unified model (no separate bookings table)
      const { data: order, error: orderErr } = await core.from('orders').insert({
        tenant_id: tenantId,
        kind: input.kind ?? 'appointment',
        stage: 'booked',
        status: 'scheduled',
        direction: hasServices ? 'credit' : null,
        party_id: input.clientId || null,
        assignee_id: input.professionalId,
        location_id: input.locationId ?? null,
        starts_at: input.startsAt,
        ends_at: endsAt,
        subtotal: totalPrice,
        total: totalPrice,
        notes: input.notes ?? null,
        metadata: {
          source: 'agenda',
          ...(serviceNames ? { serviceNames, itemsSummary: serviceNames } : {}),
          ...(contactName ? { contactName } : {}),
        },
      }).select('id').single()
      if (orderErr) throw orderErr

      // Create order items with duration + per-item assignee
      if (hasServices) {
        const orderItems = input.services.map((s, i) => ({
          order_id: order.id,
          service_id: s.serviceId,
          name: s.name,
          quantity: 1,
          unit_price: s.price,
          total: s.price,
          sort_order: i,
          duration_minutes: s.durationMinutes,
          assignee_id: s.assigneeId ?? input.professionalId,
        }))
        const { error: oiErr } = await core.from('order_items').insert(orderItems)
        if (oiErr) throw oiErr
      }

      // Return the full booking from the view
      return (await this.getBookingById(order.id))!
    },

    async updateBooking(id: string, data: UpdateBookingInput): Promise<CalendarBooking> {
      const { core } = getClients()
      const updates: Record<string, unknown> = {}
      if (data.startsAt) updates.starts_at = data.startsAt
      if (data.endsAt) updates.ends_at = data.endsAt
      if (data.status) {
        // Only update the agenda status — never touch the financial stage
        updates.status = data.status
      }
      if (data.notes !== undefined) updates.notes = data.notes
      if (data.professionalId) updates.assignee_id = data.professionalId
      if (data.clientId) updates.party_id = data.clientId
      if (data.locationId) updates.location_id = data.locationId

      // Recalculate totals when services are updated
      if (data.services) {
        const totalDuration = data.services.reduce((s, svc) => s + svc.durationMinutes, 0)
        const totalPrice = data.services.reduce((s, svc) => s + svc.price, 0)
        updates.subtotal = totalPrice
        updates.total = totalPrice
        // Recalculate ends_at from startsAt + total duration
        if (data.startsAt) {
          const ends = new Date(new Date(data.startsAt).getTime() + totalDuration * 60000)
          updates.ends_at = ends.toISOString()
        }
      }

      const { error } = await core.from('orders').update(updates).eq('id', id)
      if (error) throw error

      // Replace order_items when services change
      if (data.services) {
        await core.from('order_items').delete().eq('order_id', id)
        if (data.services.length > 0) {
          const items = data.services.map((svc, idx) => ({
            order_id: id,
            service_id: svc.serviceId || null,
            name: svc.name,
            quantity: 1,
            unit_price: svc.price,
            total: svc.price,
            sort_order: idx,
            duration_minutes: svc.durationMinutes,
            assignee_id: svc.assigneeId || null,
          }))
          const { error: itemErr } = await core.from('order_items').insert(items)
          if (itemErr) throw itemErr
        }
      }

      return (await this.getBookingById(id))!
    },

    async deleteBooking(id: string): Promise<void> {
      const { core, pub } = getClients()
      // Check stage — if already invoiced or paid, cancel instead of delete
      const { data: order } = await core.from('orders').select('stage').eq('id', id).single()
      const stage = order?.stage as string | undefined
      if (stage && ['invoiced', 'paid', 'partial', 'overdue'].includes(stage)) {
        // Cancel movements + order (don't delete financial records)
        await pub.from('financial_movements').update({ status: 'cancelled' }).eq('invoice_id', id)
        await core.from('orders').update({ status: 'cancelled', stage: 'cancelled' }).eq('id', id)
      } else {
        // Safe to delete — remove any movements first (FK constraint)
        await pub.from('financial_movements').delete().eq('invoice_id', id)
        const { error } = await core.from('orders').delete().eq('id', id)
        if (error) throw error
      }
    },

    async updateBookingStatus(id: string, status: string): Promise<CalendarBooking> {
      return this.updateBooking(id, { status: status as BookingStatus })
    },

    async checkConflict(params: ConflictCheckParams): Promise<boolean> {
      const { core } = getClients()
      let q = core.from('orders').select('id', { count: 'exact', head: true })
        .eq('assignee_id', params.assigneeId)
        .eq('kind', 'appointment')
        .not('stage', 'in', '("cancelled","no_show")')
        .not('starts_at', 'is', null)
        .lt('starts_at', params.endsAt)
        .gt('ends_at', params.startsAt)

      if (params.excludeBookingId) {
        q = q.neq('id', params.excludeBookingId)
      }

      const { count, error } = await q
      if (error) throw error
      return (count ?? 0) > 0
    },

    async getAvailableSlots(params: AvailableSlotsParams): Promise<TimeSlot[]> {
      const { pub } = getClients()
      const { data, error } = await pub.rpc('get_available_slots', {
        p_tenant_id: getTenantId(),
        p_assignee_id: params.assigneeId,
        p_date: params.date,
        p_duration_minutes: params.durationMinutes,
        p_slot_interval: params.slotInterval ?? 30,
      })
      if (error) throw error
      return (data ?? []).map((row: any) => ({ start: row.slot_start, end: row.slot_end }))
    },

    async getSchedules(professionalId?: string): Promise<Schedule[]> {
      const { core } = getClients()
      let q = core.from('schedules').select('*').eq('kind', 'working_hours')
      if (professionalId) q = q.eq('assignee_id', professionalId)
      q = q.order('day_of_week').order('starts_at')

      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapSchedule)
    },

    async saveSchedule(input: SaveScheduleInput): Promise<Schedule> {
      const { core } = getClients()
      const tenantId = getTenantId()
      if (!tenantId) throw new Error('No active tenant')

      const { data, error } = await core.from('schedules').insert({
        tenant_id: tenantId,
        kind: 'working_hours',
        assignee_id: input.assigneeId,
        location_id: input.locationId ?? null,
        day_of_week: input.dayOfWeek ?? null,
        specific_date: input.specificDate ?? null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        is_active: input.isActive !== false,
      }).select('*').single()
      if (error) throw error
      return mapSchedule(data as Record<string, unknown>)
    },

    async deleteSchedule(id: string): Promise<void> {
      const { core } = getClients()
      const { error } = await core.from('schedules').delete().eq('id', id)
      if (error) throw error
    },

    async getProfessionals(): Promise<Professional[]> {
      const { core } = getClients()
      const { data, error } = await core.from('persons')
        .select('id, name, avatar_url, is_active')
        .eq('kind', 'staff')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []).map((p: any) => ({
        id: p.id, name: p.name, avatarUrl: p.avatar_url,
        locationId: null, locationName: null, isActive: p.is_active,
      }))
    },

    async getLocations(): Promise<Array<{ id: string; name: string }>> {
      const { core } = getClients()
      const { data, error } = await core.from('locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []).map((l: any) => ({ id: l.id, name: l.name }))
    },

    async getConfirmationsPending(daysAhead = 2): Promise<CalendarBooking[]> {
      const { pub } = getClients()
      const now = new Date().toISOString()
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + daysAhead)

      const { data, error } = await pub.from('v_bookings').select('*')
        .eq('status', 'scheduled')
        .gte('starts_at', now)
        .lte('starts_at', cutoff.toISOString())
        .order('starts_at')
      if (error) throw error
      return (data ?? []).map(mapBooking)
    },

    async sendConfirmation(bookingId: string, channel: string): Promise<void> {
      const { core } = getClients()
      const { data: order } = await core.from('orders').select('metadata').eq('id', bookingId).single()
      const metadata = (order?.metadata ?? {}) as Record<string, unknown>
      const confirmations = (metadata.confirmations as any[] ?? [])
      confirmations.push({ channel, sentAt: new Date().toISOString(), status: 'sent' })
      await core.from('orders').update({ metadata: { ...metadata, confirmations } }).eq('id', bookingId)
    },

    async completeBooking(bookingId: string): Promise<{ booking: CalendarBooking; orderId: string }> {
      const { core } = getClients()
      // In unified model, the booking IS the order — just update stage
      const { error } = await core.from('orders')
        .update({ status: 'completed', stage: 'completed' })
        .eq('id', bookingId)
      if (error) throw error
      const booking = await this.getBookingById(bookingId)
      if (!booking) throw new Error('Booking not found')
      return { booking, orderId: bookingId }
    },
  }
}
