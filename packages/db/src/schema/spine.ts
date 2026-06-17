import { pgSchema, uuid } from 'drizzle-orm/pg-core'

/**
 * Ring 0 — the saas_core spine, declared as Drizzle *references* only.
 *
 * These tables are owned by the platform (@fayz/saas-core) and already exist in
 * every provisioned project. We declare a minimal shape here purely so plugin
 * tables can express real cross-schema foreign keys in TypeScript. They land in
 * the Drizzle *baseline* snapshot (never re-created), so only the `id` FK target
 * is needed — the live columns are authoritative.
 */
export const saasCore = pgSchema('saas_core')

export const tenants = saasCore.table('tenants', {
  id: uuid('id').primaryKey(),
})

export const persons = saasCore.table('persons', {
  id: uuid('id').primaryKey(),
})

export const orders = saasCore.table('orders', {
  id: uuid('id').primaryKey(),
})

export const bookings = saasCore.table('bookings', {
  id: uuid('id').primaryKey(),
})

export const products = saasCore.table('products', {
  id: uuid('id').primaryKey(),
})

export const orderItems = saasCore.table('order_items', {
  id: uuid('id').primaryKey(),
})
