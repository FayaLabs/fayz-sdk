import type { AgendaDataProvider } from './types'
import type {
  CalendarBooking, Professional, Schedule, TimeSlot,
  CreateBookingInput, UpdateBookingInput, SaveScheduleInput,
  BookingQuery, ConflictCheckParams, AvailableSlotsParams, BookingStatus,
} from '../types'
import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import { getAgendaTenantId } from '../lib/tenant'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTenantId(): string | undefined {
  // Plugin-local override wins; else fall back to the app's active tenant so
  // writes stamp the right tenant_id and pass orders/bookings RLS.
  return getAgendaTenantId() ?? getActiveTenantId()
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
  // Core v1 lives in PUBLIC — a single client serves both core and view reads.
  return { core: supabase, pub: supabase }
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

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value)))
}

function indexById(rows: any[] | null | undefined): Map<string, any> {
  return new Map((rows ?? []).filter((row) => row?.id).map((row) => [row.id, row]))
}

function groupBy<T>(rows: T[], getKey: (row: T) => string | null | undefined): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const row of rows) {
    const key = getKey(row)
    if (!key) continue
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
}

function getDurationMinutes(startsAt: string, endsAt: string | null | undefined): number | null {
  if (!endsAt) return null
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
}

function mergeBookings(viewBookings: CalendarBooking[], canonicalBookings: CalendarBooking[]): CalendarBooking[] {
  const canonicalIds = new Set(canonicalBookings.map((booking) => booking.id))
  const canonicalOrderIds = new Set(canonicalBookings.map((booking) => booking.orderId).filter(Boolean))
  const merged = [
    ...canonicalBookings,
    ...viewBookings.filter((booking) => {
      if (canonicalIds.has(booking.id)) return false
      if (booking.orderId && canonicalOrderIds.has(booking.orderId)) return false
      if (canonicalOrderIds.has(booking.id)) return false
      return true
    }),
  ]

  return merged.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
}

async function hydrateCanonicalBookings(core: any, bookings: any[]): Promise<CalendarBooking[]> {
  const personIds = unique(bookings.flatMap((booking) => [booking.party_id, booking.assignee_id]))
  const locationIds = unique(bookings.map((booking) => booking.location_id))
  const orderIds = unique(bookings.map((booking) => booking.order_id))
  const bookingIds = unique(bookings.map((booking) => booking.id))

  const [
    { data: persons, error: personsError },
    { data: locations, error: locationsError },
    { data: orders, error: ordersError },
    { data: items, error: itemsError },
  ] = await Promise.all([
    personIds.length
      ? core.from('people').select('id, name, phone, email, avatar_url').in('id', personIds)
      : Promise.resolve({ data: [], error: null }),
    locationIds.length
      ? core.from('locations').select('id, name').in('id', locationIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? core.from('orders').select('id, total, status').in('id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? core.from('order_items').select('id, order_id, service_id, name, duration_minutes, unit_price, assignee_id, sort_order').in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (personsError) throw personsError
  if (locationsError) throw locationsError
  if (ordersError) throw ordersError
  if (itemsError) throw itemsError

  const personsById = indexById(persons)
  const locationsById = indexById(locations)
  const ordersById = indexById(orders)
  // S4: line items come from order_items (single source), keyed by order_id.
  const itemsByOrderId = groupBy(items ?? [], (item: any) => item.order_id)

  return bookings.map((booking) => {
    const client = booking.party_id ? personsById.get(booking.party_id) : null
    const professional = booking.assignee_id ? personsById.get(booking.assignee_id) : null
    const location = booking.location_id ? locationsById.get(booking.location_id) : null
    const order = booking.order_id ? ordersById.get(booking.order_id) : null
    const bookingItems = ((booking.order_id ? itemsByOrderId.get(booking.order_id) : null) ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item: any) => ({
        id: item.id,
        serviceId: item.service_id,
        name: item.name,
        durationMinutes: item.duration_minutes,
        price: item.unit_price,
        assigneeId: item.assignee_id,
      }))
    const itemDuration = bookingItems.reduce((sum: number, item: any) => sum + (item.durationMinutes ?? 0), 0)

    return {
      id: booking.id,
      tenantId: booking.tenant_id,
      kind: booking.kind,
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      status: booking.status,
      notes: booking.notes,
      orderId: booking.order_id,
      locationId: booking.location_id,
      metadata: booking.metadata ?? {},
      clientId: booking.party_id,
      // Simple events (no party) fall back to the title stored in metadata.
      clientName: client?.name ?? (booking.metadata?.title as string | undefined) ?? null,
      clientPhone: client?.phone ?? null,
      clientEmail: client?.email ?? null,
      clientAvatarUrl: client?.avatar_url ?? null,
      professionalId: booking.assignee_id,
      professionalName: professional?.name ?? null,
      professionalAvatarUrl: professional?.avatar_url ?? null,
      locationName: location?.name ?? null,
      orderTotal: order?.total ?? null,
      orderStatus: order?.status ?? null,
      services: bookingItems.length ? bookingItems : null,
      totalDurationMinutes: itemDuration || getDurationMinutes(booking.starts_at, booking.ends_at),
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    } satisfies CalendarBooking
  })
}

async function getCanonicalBookings(core: any, query: BookingQuery): Promise<CalendarBooking[]> {
  let q = core.from('appointments')
    .select('id, tenant_id, kind, starts_at, ends_at, status, notes, order_id, location_id, metadata, party_id, assignee_id, created_at, updated_at')
    .gte('starts_at', query.dateRange.start)
    .lte('starts_at', query.dateRange.end)

  if (query.kind) q = q.eq('kind', query.kind)
  if (query.statuses?.length) q = q.in('status', query.statuses)
  if (query.professionalIds?.length) q = q.in('assignee_id', query.professionalIds)
  if (query.locationId) q = q.eq('location_id', query.locationId)

  const { data, error } = await q.order('starts_at', { ascending: true })
  if (error) throw error
  return hydrateCanonicalBookings(core, data ?? [])
}

async function getCanonicalBookingById(core: any, id: string): Promise<CalendarBooking | null> {
  const columns = 'id, tenant_id, kind, starts_at, ends_at, status, notes, order_id, location_id, metadata, party_id, assignee_id, created_at, updated_at'
  let { data, error } = await core.from('appointments').select(columns).eq('id', id).maybeSingle()
  if (error) throw error

  if (!data) {
    const fallback = await core.from('appointments').select(columns).eq('order_id', id).maybeSingle()
    if (fallback.error) throw fallback.error
    data = fallback.data
  }

  if (!data) return null
  const [booking] = await hydrateCanonicalBookings(core, [data])
  return booking ?? null
}

// ---------------------------------------------------------------------------
// Supabase Agenda Provider
// ---------------------------------------------------------------------------

export function createSupabaseAgendaProvider(): AgendaDataProvider {
  return {
    // v_appointments is in public schema (PostgREST default)
    async getBookings(query: BookingQuery): Promise<CalendarBooking[]> {
      const { core, pub } = getClients()
      let q = pub.from('v_appointments').select('*')
        .gte('starts_at', query.dateRange.start)
        .lte('starts_at', query.dateRange.end)

      if (query.kind) q = q.eq('kind', query.kind)
      if (query.statuses?.length) q = q.in('status', query.statuses)
      if (query.professionalIds?.length) q = q.in('professional_id', query.professionalIds)
      if (query.locationId) q = q.eq('location_id', query.locationId)

      q = q.order('starts_at', { ascending: true })

      const { data, error } = await q
      if (error) throw error
      const viewBookings = (data ?? []).map(mapBooking)
      const canonicalBookings = await getCanonicalBookings(core, query)
      return mergeBookings(viewBookings, canonicalBookings)
    },

    async getBookingById(id: string): Promise<CalendarBooking | null> {
      const { core, pub } = getClients()
      const { data, error } = await pub.from('v_appointments').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      if (data) return mapBooking(data as Record<string, unknown>)
      return getCanonicalBookingById(core, id)
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
        const { data: person } = await core.from('people').select('name').eq('id', input.clientId).single()
        contactName = person?.name as string | undefined
      }

      // Simple / Google-Calendar-style events have no client party — persist the
      // free-text title in metadata so the read model can surface it as the name.
      const eventTitle = input.title?.trim() || undefined

      const { data: order, error: orderErr } = await core.from('orders').insert({
        tenant_id: tenantId,
        kind: input.kind ?? 'appointment',
        status: 'scheduled',
        party_id: input.clientId || null,
        assignee_id: input.professionalId,
        location_id: input.locationId ?? null,
        subtotal: totalPrice,
        total: totalPrice,
        notes: input.notes ?? null,
        metadata: {
          source: 'agenda',
          ...(serviceNames ? { serviceNames, itemsSummary: serviceNames } : {}),
          ...(contactName ? { contactName } : {}),
          ...(eventTitle ? { title: eventTitle } : {}),
        },
      }).select('id').single()
      if (orderErr) throw orderErr

      const { data: booking, error: bookingErr } = await core.from('appointments').insert({
        tenant_id: tenantId,
        kind: input.kind ?? 'appointment',
        party_id: input.clientId || null,
        assignee_id: input.professionalId,
        location_id: input.locationId ?? null,
        order_id: order.id,
        starts_at: input.startsAt,
        ends_at: endsAt,
        status: 'scheduled',
        notes: input.notes ?? null,
        metadata: {
          source: 'agenda',
          ...(serviceNames ? { serviceNames, itemsSummary: serviceNames } : {}),
          ...(contactName ? { contactName } : {}),
          ...(eventTitle ? { title: eventTitle } : {}),
        },
      }).select('id').single()
      if (bookingErr) throw bookingErr

      if (hasServices) {
        // S4: line items live ONLY in order_items now (booking_items deprecated).
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

      const createdBooking = await this.getBookingById(booking.id)
      if (!createdBooking) throw new Error('Created booking did not resolve from agenda read model')
      return createdBooking
    },

    async updateBooking(id: string, data: UpdateBookingInput): Promise<CalendarBooking> {
      const { core } = getClients()
      const { data: existing, error: existingErr } = await core.from('appointments')
        .select('id, order_id, starts_at, assignee_id, metadata')
        .eq('id', id)
        .single()
      if (existingErr) throw existingErr

      const updates: Record<string, unknown> = {}
      if (data.startsAt) updates.starts_at = data.startsAt
      if (data.endsAt) updates.ends_at = data.endsAt
      // Simple-event title lives in metadata (no client party) — merge, don't clobber.
      if (data.title !== undefined) {
        updates.metadata = { ...(existing?.metadata as Record<string, unknown> ?? {}), title: data.title }
      }
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
        // Recalculate ends_at from startsAt + total duration
        const startsAt = data.startsAt ?? (existing?.starts_at as string | undefined)
        if (startsAt) {
          const ends = new Date(new Date(startsAt).getTime() + totalDuration * 60000)
          updates.ends_at = ends.toISOString()
        }
      }

      const effectiveAssigneeId = data.professionalId ?? (existing?.assignee_id as string | null | undefined) ?? null

      const { error } = await core.from('appointments').update(updates).eq('id', id)
      if (error) throw error

      // S4: services are updated only in order_items below (booking_items deprecated).
      const orderId = existing?.order_id as string | null | undefined
      if (orderId) {
        const orderUpdates: Record<string, unknown> = {}
        if (data.notes !== undefined) orderUpdates.notes = data.notes
        if (data.professionalId) orderUpdates.assignee_id = data.professionalId
        if (data.clientId) orderUpdates.party_id = data.clientId
        if (data.locationId) orderUpdates.location_id = data.locationId

        if (data.services) {
          const totalPrice = data.services.reduce((s, svc) => s + svc.price, 0)
          orderUpdates.subtotal = totalPrice
          orderUpdates.total = totalPrice
        }

        if (Object.keys(orderUpdates).length > 0) {
          const { error: orderErr } = await core.from('orders').update(orderUpdates).eq('id', orderId)
          if (orderErr) throw orderErr
        }

        if (data.services) {
          await core.from('order_items').delete().eq('order_id', orderId)
          if (data.services.length > 0) {
            const items = data.services.map((svc, idx) => ({
              order_id: orderId,
              service_id: svc.serviceId || null,
              name: svc.name,
              quantity: 1,
              unit_price: svc.price,
              total: svc.price,
              sort_order: idx,
              duration_minutes: svc.durationMinutes,
              assignee_id: svc.assigneeId ?? effectiveAssigneeId,
            }))
            const { error: itemErr } = await core.from('order_items').insert(items)
            if (itemErr) throw itemErr
          }
        }
      }

      return (await this.getBookingById(id))!
    },

    async deleteBooking(id: string): Promise<void> {
      const { core, pub } = getClients()
      const { data: booking, error: bookingErr } = await core.from('appointments')
        .select('order_id')
        .eq('id', id)
        .single()
      if (bookingErr) throw bookingErr

      const orderId = booking?.order_id as string | null | undefined
      const { count, error: movementErr } = orderId
        ? await pub.from('plg_financial_movements').select('id', { count: 'exact', head: true }).eq('invoice_id', orderId)
        : { count: 0, error: null }
      if (movementErr) throw movementErr

      if (orderId && (count ?? 0) > 0) {
        // Cancel movements + order (don't delete financial records)
        await pub.from('plg_financial_movements').update({ status: 'cancelled' }).eq('invoice_id', orderId)
        await core.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
        const { error } = await core.from('appointments').update({ status: 'cancelled' }).eq('id', id)
        if (error) throw error
      } else {
        // Safe to delete — remove any movements first (FK constraint)
        if (orderId) {
          await pub.from('plg_financial_movements').delete().eq('invoice_id', orderId)
        }
        const { error } = await core.from('appointments').delete().eq('id', id)
        if (error) throw error
        if (orderId) {
          const { error: orderErr } = await core.from('orders').delete().eq('id', orderId)
          if (orderErr) throw orderErr
        }
      }
    },

    async updateBookingStatus(id: string, status: string): Promise<CalendarBooking> {
      return this.updateBooking(id, { status: status as BookingStatus })
    },

    async checkConflict(params: ConflictCheckParams): Promise<boolean> {
      const { core } = getClients()
      let q = core.from('appointments').select('id', { count: 'exact', head: true })
        .eq('assignee_id', params.assigneeId)
        .eq('kind', 'appointment')
        .not('status', 'in', '("cancelled","no_show")')
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
        metadata: input.metadata ?? {},
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
      const { data, error } = await core.from('people')
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

      const { data, error } = await pub.from('v_appointments').select('*')
        .eq('status', 'scheduled')
        .gte('starts_at', now)
        .lte('starts_at', cutoff.toISOString())
        .order('starts_at')
      if (error) throw error
      return (data ?? []).map(mapBooking)
    },

    async sendConfirmation(bookingId: string, channel: string): Promise<void> {
      const { core } = getClients()
      const { data: booking } = await core.from('appointments').select('metadata').eq('id', bookingId).single()
      const metadata = (booking?.metadata ?? {}) as Record<string, unknown>
      const confirmations = (metadata.confirmations as any[] ?? [])
      confirmations.push({ channel, sentAt: new Date().toISOString(), status: 'sent' })
      await core.from('appointments').update({ metadata: { ...metadata, confirmations } }).eq('id', bookingId)
    },

    async completeBooking(bookingId: string): Promise<{ booking: CalendarBooking; orderId: string }> {
      const { core } = getClients()
      const { data: existing, error: existingErr } = await core.from('appointments')
        .select('order_id')
        .eq('id', bookingId)
        .single()
      if (existingErr) throw existingErr

      const { error } = await core.from('appointments')
        .update({ status: 'completed' })
        .eq('id', bookingId)
      if (error) throw error

      const orderId = existing?.order_id as string | null | undefined
      const booking = await this.getBookingById(bookingId)
      if (!booking) throw new Error('Booking not found')
      return { booking, orderId: orderId ?? bookingId }
    },
  }
}
