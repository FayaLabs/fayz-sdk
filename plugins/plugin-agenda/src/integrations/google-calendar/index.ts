// Google Calendar integration — official (in-SDK) addon for plugin-agenda.
//
// Settings-only PluginManifest: contributes a "Google Calendar" tab to /settings
// for connecting an account and running a manual sync. Outbound (booking →
// Google) is automatic via a DB trigger; inbound (Google → booking) via pg_cron
// or a Google watch webhook. The data plane is the google-calendar-sync edge
// function (see ./functions/google-calendar-sync). The booking↔event link lives
// on saas_core.bookings.metadata.googleCalendarEventId.
//
// Graduation path: extract to its own `@fayz-ai/plugin-google-calendar` package.
import React from 'react'
import type { PluginManifest } from '@fayz-ai/core'
import { GoogleCalendarSettings } from './GoogleCalendarSettings'

export { createGoogleCalendarProvider } from './data/supabase'
export { googleCalendarConnector } from './connector'
export { bookingToEvent, eventToBookingPatch, bookingSummary } from './mapping'
export * from './types'

export function createGoogleCalendarPlugin(): PluginManifest {
  return {
    id: 'google-calendar',
    name: 'Google Calendar',
    icon: 'Calendar',
    version: '0.1.0',
    scope: 'addon',
    defaultEnabled: true,
    dependencies: ['agenda'],
    navigation: [],
    routes: [],
    settings: [
      {
        id: 'google-calendar',
        label: 'Google Calendar',
        icon: 'Calendar',
        component: GoogleCalendarSettings as React.ComponentType<any>,
        order: 40,
      },
    ],
  }
}
