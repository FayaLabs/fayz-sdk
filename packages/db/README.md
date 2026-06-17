# @fayz-ai/db

> The shared Drizzle spine that every Fayz plugin schema composes with.

[![npm](https://img.shields.io/npm/v/@fayz-ai/db.svg)](https://www.npmjs.com/package/@fayz-ai/db)
[![license](https://img.shields.io/npm/l/@fayz-ai/db.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

When apps are composed from plugins, their data models have to compose too. `@fayz-ai/db` is the schema spine: a small set of canonical Drizzle tables — tenants, persons, orders, bookings, products — plus the column helpers (tenant id, timestamps) that plugin schemas build on. Every plugin references the same spine, so a CRM's clients and an agenda's bookings agree on what a person and a tenant are.

It also re-exports `drizzle-orm/pg-core` so the whole stack runs on one Drizzle instance — apps compose their own tables, the spine refs, and plugin schemas without the dual-copy `PgColumn` type clashes you get from mismatched drizzle-orm versions.

## What's inside
- **Spine tables** — `saasCore`, `tenants`, `persons`, `orders`, `bookings`, `products`, `orderItems` (Ring 0 references plugins point at)
- **Column helpers** — `tenantId`, `timestamps`, `createdAt`
- **Re-exported pg-core** — the full `drizzle-orm/pg-core` builder surface, so every package shares one drizzle-orm instance

## Install
```bash
npm install @fayz-ai/db
```
Depends on `drizzle-orm`. Import pg-core builders from here, not from `drizzle-orm` directly.

## Usage
```ts
import { pgTable, text, tenantId, timestamps, persons } from '@fayz-ai/db'

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  personId: text('person_id').references(() => persons.id),
  body: text('body'),
  tenantId: tenantId(),
  ...timestamps,
})
```

## Part of the Fayz SDK
The data spine beneath every plugin schema; apps compose it in their own `drizzle.config`.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#db) for current gaps, missing features, and good first issues.
