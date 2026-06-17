# @fayz-ai/plugin-agenda

> The scheduling engine that turns any SaaS into a bookable business.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-agenda.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-agenda)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-agenda.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Every service business runs on a calendar. Salons book stylists, clinics book doctors, studios book rooms — the same primitive, rebuilt badly a thousand times. `plugin-agenda` is that primitive done once: a resource-aware calendar with appointments, blocks, working hours, conflict detection, and drag-and-drop, all driven by config instead of forks.

It snaps into any `defineSaas` app and reshapes itself per vertical — booking types, statuses, professional/client/service lookups, and locations are all options. Pair it with `@fayz-ai/plugin-financial` and a booking can auto-create an order, so scheduling and revenue stay in sync from the first appointment. One engine, every vertical, no rewrite.

## What's inside
- **Calendar page** (`/agenda`) — FullCalendar-powered day/week/month/list views plus resource time-grid, with drag-and-drop and conflict detection.
- **Booking types** — appointments, tasks, and blocks out of the box, each with its own fields and rules; fully overridable.
- **Status workflow** — scheduled → confirmed → in progress → completed, plus cancelled / no-show, with time-aware availability.
- **Working hours & schedule blocks** — buffer time, max-concurrent, advance-booking windows, multi-location selection.
- **AI tools** — `listAppointments`, `createAppointment`, `checkAvailability` for natural-language scheduling.
- **Financial bridge** — optional cross-plugin integration that auto-creates orders and tracks booking payment status (`createFinancialBridge`, `computeCommissionAmount`).
- Supabase-or-mock data provider, settings tab, and i18n built in.

## Install
```bash
npm install @fayz-ai/plugin-agenda
```
Peer deps: `react`, `react-dom`. Runtime deps include `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas`, `@fayz-ai/plugin-financial`, and FullCalendar.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createAgendaPlugin } from '@fayz-ai/plugin-agenda'

export const app = defineSaas({
  // ...
  plugins: [
    createAgendaPlugin({
      labels: { pageTitle: 'Bookings' },
      defaultCalendarView: 'resourceTimeGridWeek',
      businessHours: { startTime: '08:00', endTime: '20:00' },
      slotDuration: 30,
      autoCreateOrder: true,
      modules: { locationSelection: true },
    }),
  ],
})
```

## Part of the Fayz SDK
`plugin-agenda` is the front door for any booking-driven vertical (beauty, health, services). It pairs naturally with `@fayz-ai/plugin-financial` via the financial bridge, and with `@fayz-ai/plugin-reports` for occupancy and revenue analytics.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-agenda) for current gaps, missing features, and good first issues.
