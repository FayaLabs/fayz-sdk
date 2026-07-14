// @fayz-ai/db — shared Drizzle schema layer for the Fayz SDK.
//
// Re-exports the spine references (Ring 0) and the column helpers that plugin
// schemas compose with. Plugins import from here; apps compose plugin schemas
// in their own drizzle.config.
// Re-export the Drizzle pg-core builders so apps import them from @fayz-ai/db
// (one drizzle-orm instance everywhere — avoids dual-copy PgColumn type clashes
// when an app composes its own tables with @fayz-ai/db spine refs + plugin schema).
export * from 'drizzle-orm/pg-core'

export { tenants, people, orders, appointments, products, orderItems } from './schema/spine'
export { tenantId, timestamps, createdAt } from './helpers'
