import React from 'react'
import type { PluginManifest } from '@fayz-ai/core'
import { createSafeDataProvider, registerTranslations } from '@fayz-ai/core'
import type { AgendaPluginOptions } from './config'
import { resolveConfig } from './config'
import { AgendaPage } from './AgendaPage'
import { createSupabaseAgendaProvider } from './data/supabase'
import { createMockAgendaProvider } from './data/mock'
import { setAgendaTenantId } from './lib/tenant'
import { createAgendaStore } from './store'
import { agendaRegistries } from './registries'
import { AgendaGeneralSettings } from './components/AgendaGeneralSettings'
import { agendaLocales } from './locales'
import { MIGRATION_001_PUBLIC_BOOKING } from './migrations'
import { setScheduleBlockConfig, getScheduleBlockConfig, PluginSettingsPanel } from '@fayz-ai/saas'

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAgendaPlugin(options?: AgendaPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  registerTranslations(agendaLocales)
  const provider = options?.dataProvider ?? createSafeDataProvider(
    () => createSupabaseAgendaProvider({ professionalKind: config.professionalKind }),
    () => createMockAgendaProvider(),
  )
  const store = createAgendaStore(provider, options?.financialBridge)
  const registries = [...agendaRegistries, ...(options?.settingsRegistries ?? [])]

  // Register schedule block config globally so ScheduleEditor can read it
  setScheduleBlockConfig({
    defaults: config.scheduleBlockDefaults,
    showServices: !!config.serviceLookup,
    showConcurrent: true,
    showBookingWindow: true,
    showLocations: config.modules.locationSelection,
    locations: config.locations.map((l) => ({ id: l.id, name: l.name })),
    // Lazy fetcher — called by ScheduleEditor when locations are needed but empty
    fetchLocations: config.modules.locationSelection && provider.getLocations
      ? async () => {
          const locations = await provider.getLocations!()
          const current = getScheduleBlockConfig()
          if (current) setScheduleBlockConfig({ ...current, locations })
          return locations
        }
      : undefined,
  })

  const PageComponent: React.FC<any> = () =>
    React.createElement(AgendaPage, { config, provider, store })

  return {
    id: 'agenda',
    name: config.labels.pageTitle,
    icon: 'Calendar',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    // Booking/scheduling is business-ops (clinic, salon, services) — targets
    // the saas/admin Panel world, not the ecommerce storefront.
    scaffolds: ['saas'],
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'appointments', label: config.labels.pageTitle, group: config.labels.pageTitle },
      { id: 'agenda.schedules', label: 'Schedule Management', group: config.labels.pageTitle },
    ],
    // Recurring monthly quota — counts appointment rows created this month.
    // (Clients/patients are the app's CRUD entity, so their cap is declared by
    // the app's EntityDef.limitKey, not here.)
    declaredLimits: [
      { key: 'bookings_month', label: 'Appointments this month', table: 'appointments', period: 'month' },
    ],
    queryEntities: [
      {
        key: 'agenda:appointments',
        entity: {
          name: 'Appointment',
          namePlural: 'Appointments',
          icon: 'Calendar',
          permission: { feature: 'appointments', action: 'read' },
          // Keys are the PROVIDER's output shape (camelCase) — what filters/
          // dateField/groupBy match against, not the raw DB columns.
          fields: [
            { key: 'startsAt', label: 'Starts at', type: 'text' },
            { key: 'endsAt', label: 'Ends at', type: 'text' },
            { key: 'status', label: 'Status', type: 'text' },
            { key: 'clientName', label: 'Client', type: 'text', searchable: true },
            { key: 'professionalName', label: 'Professional', type: 'text', searchable: true },
            { key: 'orderTotal', label: 'Order total', type: 'number' },
            { key: 'totalDurationMinutes', label: 'Duration (min)', type: 'number' },
            { key: 'createdAt', label: 'Created at', type: 'text' },
          ],
          data: {
            table: 'v_appointments',
            tenantScoped: true,
            searchColumns: ['client_name', 'professional_name'],
          },
        },
      },
    ],
    declaredRpcs: [
      {
        name: 'agent_agenda_create_appointment',
        kind: 'write' as const,
        description:
          'Guarded appointment create: agent_guard (role→plan→bookings_month cap), working hours, race-safe conflict check, audited.',
        audits: true,
      },
    ],

    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 2,
        label: config.labels.pageTitle,
        route: '/agenda',
        icon: 'Calendar',
        permission: { feature: 'appointments', action: 'read' as const },
      },
    ],

    routes: [
      {
        path: '/agenda',
        component: PageComponent,
        permission: { feature: 'appointments', action: 'read' as const },
      },
    ],

    widgets: [],

    aiTools: [
      {
        id: 'agenda.list-appointments',
        name: 'listAppointments',
        description: 'Lists upcoming appointments for a given date or date range, optionally filtered by professional.',
        icon: 'Calendar',
        mode: 'read' as const,
        category: 'Scheduling',
        parameters: {
          type: 'object' as const,
          properties: {
            date: { type: 'string' as const, description: 'Date (YYYY-MM-DD) or "today", "tomorrow", "this week"' },
            professional: { type: 'string' as const, description: 'Professional name to filter by' },
          },
        },
        suggestions: [
          { label: "What's on the agenda today?" },
          { label: 'Show me tomorrow\'s appointments' },
          { label: 'Who has the most bookings this week?' },
        ],
        permission: { feature: 'appointments', action: 'read' as const },
      },
      {
        id: 'agenda.create-appointment',
        name: 'createAppointment',
        description:
          'Creates a new appointment. Takes IDS, not names: resolve the client/service/professional ids first via findAnything/searchRecords, then call this with an ISO start time in the tenant timezone. The user confirms before booking.',
        icon: 'CalendarPlus',
        mode: 'persist' as const,
        limitKey: 'bookings_month',
        execution: { plane: 'server' as const, kind: 'rpc' as const, rpc: 'agent_agenda_create_appointment' },
        category: 'Scheduling',
        parameters: {
          type: 'object' as const,
          properties: {
            client_id: { type: 'string' as const, description: 'Client id (from a search)' },
            service_id: { type: 'string' as const, description: 'Service id (from a search)' },
            professional_id: { type: 'string' as const, description: 'Professional id (optional — auto-assigned when omitted)' },
            starts_at: { type: 'string' as const, description: 'Start datetime, ISO 8601 with timezone (e.g. 2026-07-27T13:00:00Z)' },
            notes: { type: 'string' as const, description: 'Optional notes' },
          },
          required: ['client_id', 'service_id', 'starts_at'],
        },
        suggestions: [
          { label: 'Book a haircut for Sarah tomorrow at 10am' },
        ],
        permission: { feature: 'appointments', action: 'create' as const },
      },
      {
        id: 'agenda.check-availability',
        name: 'checkAvailability',
        description: 'Checks available time slots for a professional on a given date.',
        icon: 'Clock',
        mode: 'read' as const,
        category: 'Scheduling',
        parameters: {
          type: 'object' as const,
          properties: {
            professional: { type: 'string' as const, description: 'Professional name' },
            date: { type: 'string' as const, description: 'Date (YYYY-MM-DD) or "today", "tomorrow"' },
            duration: { type: 'number' as const, description: 'Required duration in minutes' },
          },
          required: ['professional', 'date'],
        },
        suggestions: [
          { label: 'When is Ana available tomorrow?' },
          { label: 'Find a 90-minute slot for Carlos this week' },
        ],
        permission: { feature: 'appointments', action: 'read' as const },
      },
    ],

    registries,

    settings: [
      {
        id: 'agenda',
        label: 'Agenda',
        icon: 'Calendar',
        // Standard layout: General | Integrations (Google Calendar addon) | Properties.
        component: (() => {
          const AgendaSettingsTab: React.FC = () => React.createElement(PluginSettingsPanel, {
            title: 'Agenda',
            generalSettings: React.createElement(AgendaGeneralSettings),
            registries,
            hostPluginId: 'agenda',
            routeBase: '/settings/agenda',
          })
          AgendaSettingsTab.displayName = 'AgendaSettingsTab'
          return AgendaSettingsTab as unknown as React.ComponentType<unknown>
        })(),
        order: 5,
        permission: { feature: 'appointments', action: 'read' as const },
      },
    ],
    migrations: [
      {
        id: 'agenda-001-public-booking',
        version: '0.3.0',
        sql: MIGRATION_001_PUBLIC_BOOKING,
        description:
          'Booking read model (v_appointments) + anon public booking surface (v_public_services, get_available_slots, create_public_booking) + order_items duration/assignee columns',
      },
    ],

    locales: agendaLocales,
  }
}

// Re-export types for consumers
export type { AgendaPluginOptions } from './config'
export type { ResolvedAgendaConfig } from './config'
export type { AgendaDataProvider } from './data/types'
// Seedable in-memory provider — apps pass a seed to render the calendar with
// app-specific events instead of the built-in salon sample.
export { createMockAgendaProvider } from './data/mock'
export type { MockAgendaSeed, MockAgendaProviderOptions } from './data/mock'
export type { AgendaFinancialBridge, BookingPaymentStatus, BookingPaymentSummary, BookingPaymentDetail } from './financial-bridge'
export { createFinancialBridge, computeCommissionAmount } from './bridges/create-financial-bridge'

// Google Calendar integration (official addon) — settings-only plugin + helpers
export { createGoogleCalendarPlugin, createGoogleCalendarProvider, googleCalendarConnector, bookingToEvent, eventToBookingPatch } from './integrations/google-calendar'
