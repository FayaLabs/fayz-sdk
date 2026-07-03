# Checkpoint — week of 2026-06-30 → 2026-07-03

RBAC + team invites + dashboard/layout polish across the SDK and the beauty-saas
dogfood. Tracked under Linear **FAY-1263** (project: fayz-sdk).

## SDK (`@fayz-ai/*`, packages/plugins)

### RBAC / roles (app-owned)
- Roles are now sourced from the **app** (`config.permissions.defaultProfiles`),
  not hardcoded in the SDK adapter — the SDK stays domain-agnostic; each dogfood
  app defines its own business roles. `packages/saas/src/org/adapters/supabase.ts`,
  `packages/saas/src/app/admin-app.tsx`, `packages/core/src/index.ts` (export `SystemPermission`).
- Adapter now: aligns grant actions to the matrix (`create/edit`), derives
  `systemPermissions`, maps `team.manage_roles → manage_permissions`, and supports
  **custom roles** (duplicate a static system role → rename → edit; new `tenant_roles` table).
- **Central org hydration** in `OrgProvider` (`packages/saas/src/org/context.tsx`):
  loads members + profiles + the signed-in user's own profile whenever an org
  resolves. Root-cause fix for the empty role list AND the empty invite role dropdown
  (the legacy shell `OrgInitializer` isn't mounted in the native shell).
- Permissions UX: static system roles are read-only + **Duplicate**; editor uses the
  back-breadcrumb + floating **SaveBar** (CRUD pattern); list + team show skeletons.

### Invites via the plugin-auth abstraction (native, no edge function)
- Added optional `inviteUser?` to the `AuthAdapter` contract (`packages/core/src/types/auth.ts`),
  implemented in the Supabase auth adapter via **`signInWithOtp` (magic link)** — anon-callable,
  no service-role/edge function. Exposed on `useAuth()`. Org adapter delegates delivery to it.
- Security: membership is provisioned by a DB trigger that trusts the RLS-protected
  `invitations` table (not client metadata). Verified end-to-end on live Supabase.

### Self-profile ("/me")
- Rewrote `ConnectedUserProfile` to read the canonical `saas_core.profiles` row on mount
  (real `@fayz-ai/auth` user + correct `saas_core` schema) and CRUD name/avatar with metadata sync.

### Dashboard + layout
- Dedicated `finance-home` surface so B2C finance widgets stop leaking onto B2B `home` (committed `3cc5360`).
- Frame mode (`frame: true`): the inset gap now takes the header/menu color (`bg-sidebar`)
  in BOTH topbar and sidebar layouts (`packages/ui/src/layout/AppShell.tsx`).
- Command palette (⌘K + topbar Search) **remounted** in `AdminShell` (it was orphaned) + bound to `useLayoutStore`.
- KPI cards equal-height per row (`h-full`); search hover no longer flashes white;
  submenu native scrollbar hidden (`scrollbar-hide` → the defined `scrollbar-none`);
  login "Forgot password?" moved below the password field; resend/revoke invite now toast.

## Dogfood — beauty-saas
- Granular per-submodule permission taxonomy + 6 salon roles (`src/config/permissions.ts`).
- Seed SQL (`supabase/seed-saas-core.sql`, applied to live): granular permission catalog,
  salon `role_permissions`, `tenant_roles`, `is_tenant_admin` override, invite-acceptance
  trigger (`handle_invited_user`) + idempotent backfill; `scripts/db-seed.mjs` runner.
- Quick Actions section is full-width and spreads (`span: 4` + auto-fill grid).

## Verified
Mock-driven UI checks throughout; live Supabase (`gphxclpkbtbucoqclbco`): seed applied,
invite → magic link → accepted → `administrador` member provisioned; roles/permissions populated.

## Not done / follow-ups (Linear)
- FAY-1272 real member identity across the team (profiles RLS is self-only — co-members
  can't see each other's names yet); FAY-1273 per-tab sub-permission enforcement;
  FAY-1276 `/create` route for the permission editor. Supabase infra: SMTP + Site URL/Redirect fix.
