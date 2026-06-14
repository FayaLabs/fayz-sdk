// ---------------------------------------------------------------------------
// Standalone Schedule CRUD Service
// Works outside the agenda plugin context — uses Supabase directly.
// ---------------------------------------------------------------------------

import { getCoreClient } from './supabase'
import { useOrganizationStore } from '../stores/organization.store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleRecord {
  id: string
  tenantId: string
  kind: string
  assigneeId: string | null
  locationId: string | null
  dayOfWeek: number | null
  specificDate: string | null
  startsAt: string
  endsAt: string
  isActive: boolean
  metadata: Record<string, unknown>
}

export interface SaveScheduleInput {
  assigneeId: string
  locationId?: string
  dayOfWeek?: number
  specificDate?: string
  startsAt: string
  endsAt: string
  isActive?: boolean
  kind?: string
}

/** Advanced settings stored per schedule block in the metadata jsonb column. */
export interface BlockSettings {
  bufferMinutes?: number
  allowedServiceIds?: string[]
  maxConcurrent?: number
  minAdvanceHours?: number
  maxAdvanceDays?: number
  label?: string
  locationId?: string
}

/** Extract BlockSettings from a schedule record's metadata. */
export function parseBlockSettings(metadata: Record<string, unknown>): BlockSettings {
  return {
    bufferMinutes: typeof metadata.bufferMinutes === 'number' ? metadata.bufferMinutes : undefined,
    allowedServiceIds: Array.isArray(metadata.allowedServiceIds) ? metadata.allowedServiceIds : undefined,
    maxConcurrent: typeof metadata.maxConcurrent === 'number' ? metadata.maxConcurrent : undefined,
    minAdvanceHours: typeof metadata.minAdvanceHours === 'number' ? metadata.minAdvanceHours : undefined,
    maxAdvanceDays: typeof metadata.maxAdvanceDays === 'number' ? metadata.maxAdvanceDays : undefined,
    label: typeof metadata.label === 'string' ? metadata.label : undefined,
    locationId: typeof metadata.locationId === 'string' ? metadata.locationId : undefined,
  }
}

/** Merge BlockSettings into existing metadata object. */
export function mergeBlockSettings(metadata: Record<string, unknown>, settings: BlockSettings): Record<string, unknown> {
  const merged = { ...metadata }
  // Only set defined values, remove undefined ones to keep metadata clean
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)) {
      merged[key] = value
    } else {
      delete merged[key]
    }
  }
  return merged
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTenantId(): string {
  const id = useOrganizationStore.getState().currentOrg?.id
  if (!id) throw new Error('No active tenant')
  return id
}

function mapRow(row: Record<string, unknown>): ScheduleRecord {
  const r: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    r[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value
  }
  return r as unknown as ScheduleRecord
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getSchedules(
  assigneeId: string,
  kind = 'working_hours',
): Promise<ScheduleRecord[]> {
  const core = getCoreClient()
  const { data, error } = await core
    .from('schedules')
    .select('*')
    .eq('kind', kind)
    .eq('assignee_id', assigneeId)
    .order('day_of_week')
    .order('starts_at')

  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function saveSchedule(input: SaveScheduleInput): Promise<ScheduleRecord> {
  const core = getCoreClient()
  const tenantId = getTenantId()

  const { data, error } = await core
    .from('schedules')
    .insert({
      tenant_id: tenantId,
      kind: input.kind ?? 'working_hours',
      assignee_id: input.assigneeId,
      location_id: input.locationId ?? null,
      day_of_week: input.dayOfWeek ?? null,
      specific_date: input.specificDate ?? null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      is_active: input.isActive ?? true,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function deleteSchedule(id: string): Promise<void> {
  const core = getCoreClient()
  const { error } = await core.from('schedules').delete().eq('id', id)
  if (error) throw error
}

/**
 * Replace all weekly schedules (day_of_week based) for an assignee.
 * Deletes existing weekly entries and creates new ones in a single flow.
 */
export async function replaceWeeklySchedules(
  assigneeId: string,
  week: Record<number, { enabled: boolean; periods: { startsAt: string; endsAt: string; settings?: BlockSettings }[] }>,
  kind = 'working_hours',
): Promise<void> {
  const core = getCoreClient()
  const tenantId = getTenantId()

  // Delete existing weekly schedules (day_of_week NOT NULL, specific_date IS NULL)
  const { error: delErr } = await core
    .from('schedules')
    .delete()
    .eq('assignee_id', assigneeId)
    .eq('kind', kind)
    .not('day_of_week', 'is', null)
    .is('specific_date', null)

  if (delErr) throw delErr

  // Build insert rows
  const rows: Record<string, unknown>[] = []
  for (const [dayStr, day] of Object.entries(week)) {
    if (!day.enabled) continue
    for (const period of day.periods) {
      const metadata = period.settings ? mergeBlockSettings({}, period.settings) : {}
      rows.push({
        tenant_id: tenantId,
        kind,
        assignee_id: assigneeId,
        day_of_week: Number(dayStr),
        specific_date: null,
        starts_at: period.startsAt,
        ends_at: period.endsAt,
        is_active: true,
        metadata,
      })
    }
  }

  if (rows.length > 0) {
    const { error: insErr } = await core.from('schedules').insert(rows)
    if (insErr) throw insErr
  }
}

/**
 * Enumerate all dates in a range (inclusive).
 */
function eachDate(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

/**
 * Save a date-range exception.
 * type: 'unavailable' marks days off, 'available' sets custom hours.
 * Stores notes and range info in metadata for retrieval.
 */
export async function saveException(input: {
  assigneeId: string
  startDate: string
  endDate: string
  type: 'available' | 'unavailable'
  periods: { startsAt: string; endsAt: string }[]
  notes?: string
  settings?: BlockSettings
  kind?: string
}): Promise<void> {
  const core = getCoreClient()
  const tenantId = getTenantId()
  const kind = input.kind ?? 'working_hours'
  const dates = eachDate(input.startDate, input.endDate)
  const isRange = dates.length > 1
  const meta = mergeBlockSettings(
    {
      ...(input.notes ? { notes: input.notes } : {}),
      ...(isRange ? { rangeStart: input.startDate, rangeEnd: input.endDate } : {}),
      exceptionType: input.type,
    },
    input.settings ?? {},
  )

  // Delete existing exceptions for all dates in range (single query)
  const { error: delErr } = await core
    .from('schedules')
    .delete()
    .eq('assignee_id', input.assigneeId)
    .eq('kind', kind)
    .in('specific_date', dates)
  if (delErr) throw delErr

  const rows: Record<string, unknown>[] = []

  if (input.type === 'unavailable') {
    // One sentinel row per date with is_active: false
    for (const date of dates) {
      rows.push({
        tenant_id: tenantId,
        kind,
        assignee_id: input.assigneeId,
        day_of_week: null,
        specific_date: date,
        starts_at: '00:00',
        ends_at: '00:00',
        is_active: false,
        metadata: meta,
      })
    }
  } else {
    // Custom available hours for each date
    for (const date of dates) {
      for (const p of input.periods) {
        rows.push({
          tenant_id: tenantId,
          kind,
          assignee_id: input.assigneeId,
          day_of_week: null,
          specific_date: date,
          starts_at: p.startsAt,
          ends_at: p.endsAt,
          is_active: true,
          metadata: meta,
        })
      }
    }
  }

  if (rows.length > 0) {
    const { error } = await core.from('schedules').insert(rows)
    if (error) throw error
  }
}

/**
 * Delete an exception by its start date.
 * If it was part of a range, deletes all dates in that range.
 */
export async function deleteException(
  assigneeId: string,
  startDate: string,
  endDate?: string,
  kind = 'working_hours',
): Promise<void> {
  const core = getCoreClient()
  const dates = eachDate(startDate, endDate ?? startDate)
  const { error } = await core
    .from('schedules')
    .delete()
    .eq('assignee_id', assigneeId)
    .eq('kind', kind)
    .in('specific_date', dates)
  if (error) throw error
}
