import { pgTable, uuid } from 'drizzle-orm/pg-core'

/**
 * Ring 0 — the core spine, declared as Drizzle *references* only.
 *
 * These tables are owned by the platform (@fayz-ai/saas core) and already exist
 * in every provisioned pool, directly in the `public` schema (industry-pool
 * model — no saas_core schema). We declare a minimal shape here purely so plugin
 * tables can express real foreign keys in TypeScript. They land in the Drizzle
 * *baseline* snapshot (never re-created), so only the `id` FK target is needed —
 * the live columns are authoritative.
 */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey(),
})

export const people = pgTable('people', {
  id: uuid('id').primaryKey(),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
})

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey(),
})

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey(),
})
