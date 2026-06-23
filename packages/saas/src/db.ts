// Front-door re-export of @fayz-ai/db.
//
// Apps built on @fayz-ai/saas import drizzle builders + the cross-schema spine
// (tenants/persons/orders/bookings, tenantId/timestamps helpers) from
// `@fayz-ai/saas/db` instead of depending on @fayz-ai/db directly — keeping a
// single drizzle-orm instance and a single fayz front door.
//
// NOTE: this subpath is consumed by drizzle-kit (db:generate/check), which uses
// raw Node resolution — so unlike `@fayz-ai/saas/ui`, it only works once this
// package is published with the `./db` export. There is no local-source alias
// fallback for the drizzle-kit toolchain.
export * from '@fayz-ai/db'
