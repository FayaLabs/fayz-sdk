# @fayz-ai/plugin-tables

> A live floor plan for restaurants — seat, track, and turn tables in real time.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-tables.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-tables)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-tables.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Restaurants don't run on records — they run on the room. plugin-tables gives the food vertical a real floor plan: zones, tables, and live status (available, occupied, reserved, cleaning), with seat and close flows wired to your own backend. It's the difference between a generic CRM and software a host can actually work a Friday night on.

It snaps into a `defineSaas` app as the vertical surface for food. Configure zones, toggle reservations and session history, and hand the AI assistant the ability to answer "which tables are free?" or seat guests by table number — all permission-gated, all in the same app as bookings and payments.

## What's inside
- **`/tables` route + nav entry** (icon `MapPin`) with a live floor plan view
- **Zones** — configurable defaults (Indoor, Outdoor, Bar) via `defaultZones`
- **Optional modules** — `reservations` (off by default) and `sessionHistory` (on by default)
- **Lifecycle hooks** — `onTableSeated` and `onTableClosed` to bridge sessions into your orders/payments
- **AI tools** — `getTableAvailability` (read) and `seatGuests` (persist, `tables:edit`)
- **Settings tab** — zone and floor-plan configuration via `PluginSettingsPanel`
- **Pluggable data layer** — `dataProvider` option, with `createFayzTablesProvider` exported, or a built-in mock provider for local dev
- **Vertical scope** — defaults to `scope: 'vertical'`, with i18n locales included

## Install
```bash
npm install @fayz-ai/plugin-tables
```
Peer deps: `react`, `react-dom`. Runtime deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas`, `@fayz-ai/sdk`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createTablesPlugin } from '@fayz-ai/plugin-tables'

export const app = defineSaas({
  // ...
  plugins: [
    createTablesPlugin({
      modules: { reservations: true, sessionHistory: true },
      defaultZones: [
        { name: 'Indoor', color: '#3b82f6' },
        { name: 'Patio', color: '#22c55e' },
      ],
      onTableSeated: async (session) => createOrderFor(session),
      onTableClosed: async (session) => closeOrderFor(session),
    }),
  ],
})
```

## Part of the Fayz SDK
One of the composable plugins for `@fayz-ai/saas` — this is the food vertical's room-management surface.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-tables) for current gaps, missing features, and good first issues.
