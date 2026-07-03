import type { PluginRegistryDef, PluginScope, VerticalId } from '@fayz-ai/core'
import type { EntityLookup } from '@fayz-ai/saas'
import type { AgendaDataProvider } from './data/types'
import type { StatusConfig, BookingTypeConfig } from './types'
import type { AgendaFinancialBridge } from './financial-bridge'
import type { EntityDef } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Public options interface
// ---------------------------------------------------------------------------

export interface AgendaPluginLabels {
  pageTitle: string
  pageSubtitle: string
  calendar: string
  dayView: string
  weekView: string
  monthView: string
  listView: string
  workingHours: string
  confirmations: string
  newAppointment: string
  filters: string
}

export interface ConfirmationChannelOption {
  id: string
  label: string
  icon: string
}

export interface CancellationReasonOption {
  id: string
  label: string
  requiresNotes?: boolean
}

export interface CancellationDetailsProvider {
  listReasons(): Promise<CancellationReasonOption[]>
  saveCancellationDetails(input: {
    bookingId: string
    reasonId: string
    notes?: string
    cancelledAt?: string
  }): Promise<void>
}

export interface ExternalBookingSource {
  type: string
  id?: string
  [key: string]: unknown
}

export interface LocationOption {
  id: string
  name: string
  isHQ?: boolean
}

export interface AgendaPluginOptions {
  modules?: {
    workingHours?: boolean
    confirmations?: boolean
    conflictDetection?: boolean
    dragAndDrop?: boolean
    locationSelection?: boolean
    /** Enable financial integration (auto-enabled when financialBridge is provided) */
    financial?: boolean
  }
  labels?: Partial<AgendaPluginLabels>
  currency?: { code?: string; locale?: string; symbol?: string }

  /** Booking kind used in saas_core.bookings.kind (default: 'appointment') */
  bookingKind?: string

  /** Order kind for financial records (default: 'service_order') */
  orderKind?: string

  /** Schedule kind in saas_core.schedules.kind (default: 'working_hours') */
  scheduleKind?: string

  /** Booking type tabs shown in the appointment modal */
  bookingTypes?: BookingTypeConfig[]

  /**
   * Simplifies the agenda to Google-Calendar-style events (no client /
   * professional / service). When set to 'simple', the plugin exposes a single
   * "Evento" booking type whose modal shows only title / date-time / notes.
   * Ignored when an explicit `bookingTypes` override is provided.
   */
  eventMode?: 'simple'

  /** Booking status options */
  statuses?: StatusConfig[]

  /** Default calendar view (default: 'resourceTimeGridWeek'). Options: 'dayGridMonth', 'timeGridWeek', 'resourceTimeGridWeek', 'listWeek' */
  defaultCalendarView?: string

  /** Calendar visible time range (default: '07:00'-'21:00') */
  businessHours?: { startTime: string; endTime: string }

  /** Slot duration in minutes (default: 30) */
  slotDuration?: number

  /** Person kind for professionals (default: 'staff') */
  professionalKind?: string

  /** Person kind for clients (default: 'customer') */
  clientKind?: string

  /** Auto-create an order when creating a booking (default: true) */
  autoCreateOrder?: boolean

  /** Contact/client lookup */
  contactLookup?: EntityLookup

  /** Client entity definition for the Client tab in booking modal */
  clientEntityDef?: EntityDef

  /** Service lookup */
  serviceLookup?: EntityLookup

  /** Professional/staff lookup */
  professionalLookup?: EntityLookup

  /** Location lookup */
  locationLookup?: EntityLookup

  /** Called when user clicks a selected entity link (e.g. view client profile) */
  onEntityClick?: (type: 'client' | 'service' | 'professional', id: string) => void

  /** Business locations for unit filtering */
  locations?: LocationOption[]

  /** Confirmation channel options */
  confirmationChannels?: ConfirmationChannelOption[]

  /** Optional app/plugin bridge for cancel-time reason capture. */
  cancellationDetails?: CancellationDetailsProvider

  /** Called after a booking is created from an external operational source. */
  onBookingCreated?: (input: { bookingId: string; source?: ExternalBookingSource }) => void | Promise<void>

  /** App-owned registries shown under /settings/agenda Properties. */
  settingsRegistries?: PluginRegistryDef[]

  /** Financial bridge for agenda × financial cross-plugin integration */
  financialBridge?: AgendaFinancialBridge

  /** Data provider — defaults to Supabase, falls back to mock */
  dataProvider?: AgendaDataProvider

  /** Default values for schedule block advanced settings */
  scheduleBlockDefaults?: {
    bufferMinutes?: number
    maxConcurrent?: number
    minAdvanceHours?: number
    maxAdvanceDays?: number
  }

  navPosition?: number
  navSection?: 'main' | 'secondary'
  scope?: PluginScope
  verticalId?: VerticalId
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: AgendaPluginLabels = {
  pageTitle: 'Agenda',
  pageSubtitle: 'Calendar and appointment management',
  calendar: 'Calendar',
  dayView: 'Day',
  weekView: 'Week',
  monthView: 'Month',
  listView: 'Agenda',
  workingHours: 'Working Hours',
  confirmations: 'Confirmations',
  newAppointment: 'New Appointment',
  filters: 'Filters',
}

const DEFAULT_CURRENCY = { code: 'BRL', locale: 'pt-BR', symbol: 'R$' }

const DEFAULT_STATUSES: StatusConfig[] = [
  { value: 'scheduled', label: 'Scheduled', color: '#6366f1' },
  { value: 'confirmed', label: 'Confirmed', color: '#3b82f6' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b', availableWhen: 'today_only' },
  { value: 'completed', label: 'Completed', color: '#10b981', availableWhen: 'today_or_past' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  { value: 'no_show', label: 'No Show', color: '#6b7280', availableWhen: 'today_or_past' },
]

const DEFAULT_BOOKING_TYPES: BookingTypeConfig[] = [
  {
    id: 'appointment', label: 'Appointment', icon: 'Calendar', color: '#6366f1',
    fields: { client: true, professional: true, services: true, location: true, status: true },
    requiresServices: true, requiresClient: true,
  },
  {
    id: 'task', label: 'Task', icon: 'CheckSquare', color: '#f59e0b',
    fields: { client: false, professional: true, services: false, location: false, status: true },
    requiresServices: false, requiresClient: false,
  },
  {
    id: 'block', label: 'Block', icon: 'Ban', color: '#6b7280',
    fields: { client: false, professional: true, services: false, location: false, status: false },
    requiresServices: false, requiresClient: false,
  },
]

// Simple / Google-Calendar-style event — a single "Evento" type with just a
// free-text title, date-time and notes. No client / professional / service.
// Used by personal-finance-style agendas (see eventMode: 'simple').
const SIMPLE_EVENT_BOOKING_TYPES: BookingTypeConfig[] = [
  {
    id: 'event', label: 'Event', icon: 'Calendar', color: '#6366f1',
    fields: { title: true, client: false, professional: false, services: false, location: false, status: false },
    requiresServices: false, requiresClient: false,
  },
]

// ---------------------------------------------------------------------------
// Resolved config — fully merged, no optionals
// ---------------------------------------------------------------------------

export interface AgendaModules {
  workingHours: boolean
  confirmations: boolean
  conflictDetection: boolean
  dragAndDrop: boolean
  locationSelection: boolean
  financial: boolean
}

/**
 * Derived UI capabilities — computed ONCE in resolveConfig from the resolved
 * bookingTypes so no component ever re-derives "is this a simple event agenda?"
 * ad-hoc. A capability is enabled when ANY booking type uses that field. In
 * eventMode:'simple' the single "Evento" type disables
 * client/professional/services/location/status, so every consumer (popover,
 * filter rail, modal) hides the professional/service/status machinery in one
 * place instead of scattering `eventMode === 'simple'` checks.
 */
export interface AgendaCapabilities {
  title: boolean
  client: boolean
  professional: boolean
  services: boolean
  location: boolean
  status: boolean
}

export interface AgendaCurrency {
  code: string
  locale: string
  symbol: string
}

export interface ResolvedAgendaConfig {
  modules: AgendaModules
  /** Whether this is a simple Google-Calendar-style event agenda (eventMode:'simple'). */
  simpleMode: boolean
  /** Derived once from bookingTypes — see AgendaCapabilities. */
  capabilities: AgendaCapabilities
  labels: AgendaPluginLabels
  currency: AgendaCurrency
  bookingKind: string
  orderKind: string
  scheduleKind: string
  statuses: StatusConfig[]
  bookingTypes: BookingTypeConfig[]
  businessHours: { startTime: string; endTime: string }
  slotDuration: number
  professionalKind: string
  clientKind: string
  autoCreateOrder: boolean
  locations: LocationOption[]
  confirmationChannels: ConfirmationChannelOption[]
  cancellationDetails?: CancellationDetailsProvider
  onBookingCreated?: (input: { bookingId: string; source?: ExternalBookingSource }) => void | Promise<void>
  contactLookup?: EntityLookup
  clientEntityDef?: EntityDef
  serviceLookup?: EntityLookup
  professionalLookup?: EntityLookup
  locationLookup?: EntityLookup
  onEntityClick?: (type: 'client' | 'service' | 'professional', id: string) => void
  financialBridge?: AgendaFinancialBridge
  scheduleBlockDefaults: {
    bufferMinutes: number
    maxConcurrent: number
    minAdvanceHours: number
    maxAdvanceDays: number
  }
  defaultCalendarView: string
}

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

export function resolveConfig(options?: AgendaPluginOptions): ResolvedAgendaConfig {
  // ── eventMode:'simple' derives ALL module + capability defaults ONCE, here. ──
  // Simple = Google-Calendar-style events (title/description + timestamp). It
  // flips professional/service machinery OFF by default: no working-hours /
  // schedule checks, no confirmations outreach, no conflict (double-booking)
  // detection, no location. Explicit `modules.*` re-enable individually. Full
  // mode (beauty) is unchanged — every default below matches the old behavior
  // when `simple` is false. Field-level machinery (client/professional/
  // services/location/status/title) is derived into `capabilities` from the
  // resolved bookingTypes, so components never test eventMode themselves.
  const simple = options?.eventMode === 'simple'
  const bookingTypes = options?.bookingTypes
    ?? (simple ? SIMPLE_EVENT_BOOKING_TYPES : DEFAULT_BOOKING_TYPES)
  const capabilities: AgendaCapabilities = {
    title: bookingTypes.some((bt) => bt.fields.title === true),
    client: bookingTypes.some((bt) => bt.fields.client),
    professional: bookingTypes.some((bt) => bt.fields.professional),
    services: bookingTypes.some((bt) => bt.fields.services),
    location: bookingTypes.some((bt) => bt.fields.location),
    status: bookingTypes.some((bt) => bt.fields.status),
  }
  return {
    modules: {
      // Off-unless-explicit in simple mode (`?? !simple`); default-on in full.
      workingHours: options?.modules?.workingHours ?? !simple,
      confirmations: options?.modules?.confirmations ?? !simple,
      conflictDetection: options?.modules?.conflictDetection ?? !simple,
      dragAndDrop: options?.modules?.dragAndDrop !== false,
      locationSelection: options?.modules?.locationSelection === true,
      financial: options?.modules?.financial ?? !!options?.financialBridge,
    },
    simpleMode: simple,
    capabilities,
    labels: { ...DEFAULT_LABELS, ...options?.labels },
    currency: { ...DEFAULT_CURRENCY, ...options?.currency },
    bookingKind: options?.bookingKind ?? 'appointment',
    orderKind: options?.orderKind ?? 'service_order',
    scheduleKind: options?.scheduleKind ?? 'working_hours',
    statuses: options?.statuses ?? DEFAULT_STATUSES,
    bookingTypes,
    businessHours: options?.businessHours ?? { startTime: '07:00', endTime: '21:00' },
    slotDuration: options?.slotDuration ?? 30,
    professionalKind: options?.professionalKind ?? 'staff',
    clientKind: options?.clientKind ?? 'customer',
    autoCreateOrder: options?.autoCreateOrder !== false,
    locations: options?.locations ?? [],
    confirmationChannels: options?.confirmationChannels ?? [],
    cancellationDetails: options?.cancellationDetails,
    onBookingCreated: options?.onBookingCreated,
    contactLookup: options?.contactLookup,
    clientEntityDef: options?.clientEntityDef,
    serviceLookup: options?.serviceLookup,
    professionalLookup: options?.professionalLookup,
    locationLookup: options?.locationLookup,
    onEntityClick: options?.onEntityClick,
    financialBridge: options?.financialBridge,
    scheduleBlockDefaults: {
      bufferMinutes: options?.scheduleBlockDefaults?.bufferMinutes ?? 0,
      maxConcurrent: options?.scheduleBlockDefaults?.maxConcurrent ?? 1,
      minAdvanceHours: options?.scheduleBlockDefaults?.minAdvanceHours ?? 0,
      maxAdvanceDays: options?.scheduleBlockDefaults?.maxAdvanceDays ?? 60,
    },
    defaultCalendarView: options?.defaultCalendarView ?? 'resourceTimeGridWeek',
  }
}
