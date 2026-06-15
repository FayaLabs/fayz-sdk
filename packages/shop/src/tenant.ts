// Tenant scoping for shop queries. @fayz-ai/shop has no dependency on @fayz-ai/saas —
// the host app (or @fayz-ai/plugin-shop) registers a resolver that returns the
// current tenant id. When no resolver is set, queries are unscoped (RLS still
// applies server-side).

export type TenantResolver = () => string | undefined

let _resolver: TenantResolver | null = null

export function setShopTenantResolver(resolver: TenantResolver): void {
  _resolver = resolver
}

export function getShopTenantId(): string | undefined {
  if (!_resolver) return undefined
  try {
    return _resolver()
  } catch {
    return undefined
  }
}
