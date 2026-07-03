// Tenant scoping for course queries. @fayz-ai/courses has no dependency on
// @fayz-ai/saas — the host app (or @fayz-ai/plugin-courses) registers a resolver
// that returns the current tenant id (the creator that owns the courses). When
// no resolver is set, queries are unscoped (RLS still applies server-side).

export type TenantResolver = () => string | undefined

let _resolver: TenantResolver | null = null

export function setCoursesTenantResolver(resolver: TenantResolver): void {
  _resolver = resolver
}

export function getCoursesTenantId(): string | undefined {
  if (!_resolver) return undefined
  try {
    return _resolver()
  } catch {
    return undefined
  }
}
