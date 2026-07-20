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
        description: 'Creates a new appointment for a client with a specific professional and service.',
        icon: 'CalendarPlus',
        mode: 'persist' as const,
        category: 'Scheduling',
        parameters: {
          type: 'object' as const,
          properties: {
            client: { type: 'string' as const, description: 'Client name' },
            professional: { type: 'string' as const, description: 'Professional name' },
            service: { type: 'string' as const, description: 'Service name' },
            date: { type: 'string' as const, description: 'Date (YYYY-MM-DD)' },
            time: { type: 'string' as const, description: 'Time (HH:MM)' },
          },
          required: ['client', 'professional', 'service', 'date', 'time'],
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
