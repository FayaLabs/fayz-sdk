/**
 * Entitlements — the plan side of the access decision (the role side lives in
 * permissions.ts). A plan grants FEATURES (gate a page/module) and caps LIMITS
 * (quantity ceilings). Feature ids are the SAME id space as RBAC/nav
 * (`permission.feature`), so a single id threads role → nav → plan.
 */
export interface PlanEntitlements {
  /**
   * feature id (same id as RBAC/nav) → whether the plan grants it. Absent = the
   * plan does not gate the feature (allowed). Only an explicit `false` denies —
   * this keeps plans additive: features unknown to a plan stay open.
   */
  features?: Record<string, boolean>
  /**
   * limitKey → cap. `-1` = unlimited. Keys are app/plugin-defined (e.g.
   * `clients`, `users`, `locations`, `bookings_month`). A key absent here means
   * "no cap on this plan" (unlimited). See {@link LimitDeclaration} for how a
   * key is bound to a countable table.
   */
  limits?: Record<string, number>
}

/**
 * Declares HOW a limit key is counted. Contributed by plugins via
 * `PluginManifest.declaredLimits` (aggregated by the plugin runtime) and/or
 * overridden per-app via `billing.limitDeclarations`. The access engine reads a
 * declaration to resolve a `limitKey` → a live `count(*)` against `table` for
 * the active tenant, with no per-entity code.
 */
export interface LimitDeclaration {
  /** Limit key — matches a key in {@link PlanEntitlements.limits}. */
  key: string
  /** Human label for paywalls / usage banners (e.g. "Patients"). */
  label: string
  /** Table the count runs against (tenant-scoped via `tenant_id`). */
  table: string
  /** Optional `kind` column filter for tables that hold several entity kinds. */
  kindFilter?: string
  /**
   * Counting window. `'month'` counts rows created since the start of the
   * current month (recurring quotas like bookings/month); `'total'` (default)
   * counts every row (stock quantities like clients/users).
   */
  period?: 'month' | 'total'
}
