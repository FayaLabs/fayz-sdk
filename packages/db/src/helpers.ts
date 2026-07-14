import { uuid, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './schema/spine'

/**
 * Canonical tenant-scoping column: `tenant_id uuid NOT NULL REFERENCES
 * public.tenants(id) ON DELETE CASCADE`. Every Ring-1 plugin table uses this
 * so tenancy is identical everywhere (and RLS can assume the column exists).
 */
export const tenantId = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' })

/** Standard `created_at` / `updated_at` timestamptz pair with `now()` defaults. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

/** Just `created_at` (for append-only / event-style tables). */
export const createdAt = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}
