# @fayz-ai/saas

> Turn plugins into a real multi-tenant SaaS with one `defineSaas` call.

[![npm](https://img.shields.io/npm/v/@fayz-ai/saas.svg)](https://www.npmjs.com/package/@fayz-ai/saas)
[![license](https://img.shields.io/npm/l/@fayz-ai/saas.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — published to npm and used across Fayz dogfood apps. Pre-1.0: minor APIs may change before 1.0.

This is where the Fayz pitch becomes a product. `@fayz-ai/saas` is the multi-tenant layer that wraps the headless core in everything a commercial app needs: organizations and tenancy, role-based permissions, billing, a native CRUD engine, and a full admin shell. You enable a set of plugins, call `defineSaas`, and get a running app with auth, org switching, permission gates, and a generated admin UI.

A salon and a clinic ship from the same engine — `@fayz-ai/saas` is the part that makes each one a real, isolated, billable tenant. Plugins snap in; this layer gives them an org to live in, a user to act as, and a shell to render through.

## What's inside
- **App factory** — `defineSaas`, `createSaasApp`, `createFayzApp`, `AdminScaffold`, `AdminShell`, `LoginPage` (manifest-first admin entry)
- **CRUD engine** — `CrudPage`, `CrudListView`, `CrudFormPage`, `CrudDetailPage`, `CrudCardGrid`, `createCrudPage`, `ImportWizard`, `exportToCSV`
- **Org / multi-tenancy** — `createSupabaseOrgAdapter`, `createMockOrgAdapter`, `OrgProvider`, `useTenant`, `useOrganizationStore`
- **Permissions** — `PermissionsProvider`, `PermissionGate`, `usePermission`, `useHasPermission`, `usePermissions`
- **Billing** — `useBillingStore` with `Subscription` / `Invoice` types (Stripe-backed)
- **Plugin framework UI** — `WidgetSlot`, `SettingsGroup`, `QuickActionsButton`, `ModuleActionBar`, `createPluginContext`, `createViewRouter`, `PluginRegistryManager`
- **Supabase + theme** — `createFayzSupabaseClient`, `getCoreSchemaClient`, `createFayzTheme`, `fayzThemePresets`

## Install
```bash
npm install @fayz-ai/saas
```
Peer dep: `react` (^18/^19). Pulls in `@fayz-ai/core`, `@fayz-ai/auth`, and `@fayz-ai/ui`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'

export default defineSaas({
  name: 'Glow Studio',
  plugins: [crmPlugin, agendaPlugin, financialPlugin],
  org: { adapter: orgAdapter },
})
```

## Part of the Fayz SDK
The top of the stack — the multi-tenant SaaS layer that composes `core`, `auth`, and `ui` into a shippable app.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#saas) for current gaps, missing features, and good first issues.
