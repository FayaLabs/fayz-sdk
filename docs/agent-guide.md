# Fayz SDK — Agent Building Guide

This document is the primary reference for AI agents generating new projects with `@fayz-ai/saas-core` (current) or the `fayz-sdk` packages (future). Read it entirely before scaffolding or modifying any app.

## Current Operating Status — 2026-06-14

Fayz-generated projects are moving to a manifest-first SDK contract.

For new work in Fayz-generated projects:

- Use public npm `@fayz-ai/sdk` as the default package for every generated project: app params, normalized API access, shared types, and runtime OAuth broker helpers.
- Use the platform-bundled app-runtime for manifest rendering. Do not install, publish, or document `@fayz-ai/app-runtime` as public product API until the Beauty manifest proof proves that package boundary.
- Treat Fayz SDK as open-source client/runtime code. Do not add secrets, OAuth client secrets, provider refresh tokens, partner API keys, or tenant-authority decisions to SDK packages, generated repos, manifests, or browser code.
- Plugin/integration authentication uses OAuth through Fayz/server-side infrastructure. Plugins may declare required providers/scopes and call SDK/Fayz OAuth helpers, but OAuth token storage, refresh, revocation, audit, and tenant grants belong to Fayz-controlled services.
- Treat `app.manifest.json` as the first edit surface for pages, surfaces, plugins, entities, permissions, theme, and backend provider selection.
- Keep `app.manifest.json` pure JSON: no functions, React components, secrets, tokens, or migration approvals.
- Use `src/registry.tsx` for app-owned code referenced by manifest ids such as `custom:dashboard.Home`.
- Use `src/plugins.generated.ts` only for Fayz-installed plugin registrations; Fayz owns that file.
- New AppManifest writes must stay inside the strict v2 schema. Do not add ad hoc fields like top-level `title`, `surfaces.*.id`, `surfaces.*.name`, `surfaces.*.title`, page `id`, page `title`, plugin `pluginId`, plugin `title`, or plugin `label`.
- Keep `manifestVersion` at `2` unless a real SDK/API manifest migration is registered and approved. SDK `validateManifest()` and Fayz API public writes reject any other version. Do not bump this field manually to signal feature work.
- When changing `@fayz-ai/core` AppManifest runtime/schema behavior, run `pnpm --filter @fayz-ai/core typecheck` and then root `pnpm check:manifest`. The root manifest check is turbo-filtered to `@fayz-ai/core`, builds/checks the package only, imports built `dist`, validates canonical v2, confirms schema `manifestVersion.const = 2`, and rejects v1/v3. Do not run unfiltered `turbo check:manifest`; it expands into unrelated package builds.
- Put page display text in `pages[].label`, plugin display/config metadata in `plugins[].config` such as `config.label`, and surface-level display/config metadata in `surfaces.*.options`.
- Plugin refs must use canonical `plugins[].id`. Do not write new `plugins[].pluginId` refs.
- Generated scaffold currently declares both `surfaces.panel` and `surfaces.admin`.
  - `panel` seeds Fayz editor Panel through `ProjectAppManifest`.
  - `admin` is reserved for the generated app admin surface.
- `ProjectAppManifest` scope is always `tenantKey + environment + surface`.
  - Default generated-project scope is `tenantKey="default"`, `environment="preview"`, and `surface="panel"`.
  - Trim scope strings before writes/reads; blank scope values resolve to defaults, while unsupported enum values must fail before persistence.
  - Use only supported environments `preview` or `production` and supported binding surfaces `panel`, `admin`, `storefront`, or `portal`.
- Package source is locked to public npm for `@fayz-ai/sdk` only. Do not reintroduce GitHub Packages `.npmrc` auth requirements into generated apps, and do not add internal runtime/plugin packages as public generated-app dependencies.
- For `backend.provider = "fayz-api"`:
  - editor/admin tooling uses the authenticated Fayz route `/api/projects/:projectId/database/...`;
  - generated runtime apps must use `createFayzApiProvider({ runtimeToken })`, which calls `/api/v1/runtime/projects/:projectId/database/...`;
  - `runtimeToken` must be a short-lived runtime-data JWT minted by Fayz/server-side code with signed `projectId`, `tenantId`, and row permissions;
  - public generated apps must not claim production readiness on `fayz-api` until the OAuth-backed Runtime Session Broker / server-side exchange is enabled;
  - never embed OAuth secrets, provider refresh tokens, partner `ApiToken`, raw Fayz secrets, or caller-provided tenant authority in browser code.
- For plugin/provider calls such as Google Calendar:
  - use `createFayzRuntimeClient()` from `@fayz-ai/sdk`;
  - exchange a runtime-data token through Fayz for a short-lived Plugin OAuth broker token;
  - call brokered helpers such as `fayz.googleCalendar(broker.token).createEvent(...)`;
  - do not create OAuth clients or direct provider API calls in browser/generated code.
- Legacy `createSaasApp` / `@fayz-ai/saas-core` examples below are migration reference for existing apps, not the default direction for new generated Fayz projects.

---

## Package source map

Generated apps should install public npm `@fayz-ai/sdk` only. During dogfood,
apps may import internal `@fayz-ai/*` runtime/plugin names through local Vite/TS
aliases pointing at `/Users/fayalabs/dev/fayz-sdk`; those names are internal
implementation seams, not public npm product API.

| Plugin / utility | Import from |
|---|---|
| `fayz`, `createFayzClient`, `appParams`, `createFayzRuntimeClient` | `@fayz-ai/sdk` |
| App runtime, shell, plugin factories, UI primitives | platform-bundled/internal `fayz-sdk` source during dogfood |
| `createFayzRuntimeClient`, `FayzRuntimeError` | `@fayz-ai/sdk` |

Types (`EntityDef`, `FieldDef`, `PageConfig`, `SaasTheme`, etc.) come from `@fayz-ai/saas`
(or `@fayz-ai/saas-core` — same types via the bridge). `PluginManifest` comes from `@fayz-ai/core`.

**Reference apps:** `../beauty-saas` (services vertical, agenda-centric) and
`../marketplace-saas` (e-commerce, shop-centric) — copy their `vite.config.ts` and
`tsconfig.json` `paths` block when scaffolding a new app.

---

## Legacy `createSaasApp` Reference

Existing Beauty/resto apps may still call `createSaasApp(config)` while we extract them. This is migration reference, not the default for new generated projects. New generated apps should use `app.manifest.json` plus `renderApp(manifest)`.

```tsx
// src/App.tsx
import { createSaasApp } from '@fayz-ai/saas-core'
import { createAgendaPlugin } from '@fayz-ai/saas-core/plugins/agenda'
import { createCrmPlugin } from '@fayz-ai/saas-core/plugins/crm'
import { createDashboardPlugin } from '@fayz-ai/saas-core/plugins/dashboard'
import { createCrudPage, createArchetypeLookup } from '@fayz-ai/saas-core'
import React from 'react'
import { Logo } from './components/Logo'
import { clientEntity } from './types/client'
import { serviceEntity } from './types/service'
import { appTranslations } from './i18n'

export const App = createSaasApp({
  name: 'My App',
  logo: React.createElement(Logo),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,

  auth: {
    adapter: import.meta.env.VITE_SUPABASE_URL ? 'supabase' : 'mock',
    requireAuth: true,
    loginLayout: 'split',
    loginTagline: 'Manage your business',
  },

  locale: {
    default: 'pt-BR',
    supported: ['en', 'pt-BR'],
    translations: appTranslations,
    currency: 'BRL',   // ISO 4217 — all currency fields format with this + the active locale.
                       // Optional: inferred from locale when omitted (pt-BR → BRL, en → USD).
  },

  theme: {
    name: 'violet',
    brand: '#7c3aed',
    radius: 'soft',
    font: 'inter',
  },

  layout: 'topbar',  // 'sidebar' | 'topbar' | 'minimal'

  plugins: [
    createDashboardPlugin({ navPosition: 0 }),
    createAgendaPlugin({ navPosition: 1, currency: { code: 'BRL', locale: 'pt-BR' } }),
    createCrmPlugin({ navPosition: 2 }),
  ],

  pages: [
    {
      path: '/clients',
      label: 'Clients',
      icon: 'Users',
      component: createCrudPage(clientEntity),
    },
  ],

  permissions: {
    features: [
      { id: 'clients', label: 'Clients' },
      { id: 'agenda', label: 'Agenda', group: 'Modules' },
    ],
    defaultProfiles: [
      {
        id: 'admin',
        name: 'Admin',
        isSystem: true,
        description: 'Full access',
        systemPermissions: ['manage_team', 'manage_billing', 'manage_settings'],
        grants: { clients: ['read', 'create', 'edit', 'delete'], agenda: ['read', 'create', 'edit', 'delete'] },
      },
      {
        id: 'staff',
        name: 'Staff',
        isSystem: true,
        description: 'Day-to-day operations',
        systemPermissions: [],
        grants: { clients: ['read', 'create'], agenda: ['read', 'create'] },
      },
    ],
  },
})
```

The returned `App` is a React component — render it directly in `main.tsx`:

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

---

## createSaasApp — full config reference

```typescript
createSaasApp(config: SaasAppConfig): React.FC
```

### Top-level fields

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | App display name (shown in header) |
| `logo` | `string \| ReactNode` | — | String → renders as badge; ReactNode → renders as-is |
| `supabaseUrl` | `string` | — | Supabase project URL. If omitted → mock mode |
| `supabaseAnonKey` | `string` | — | Supabase anon key |
| `layout` | `'sidebar' \| 'topbar' \| 'minimal'` | `'sidebar'` | App shell layout variant |
| `sidebarFrame` | `boolean` | `true` | Content floats in a rounded frame over the sidebar |
| `pages` | `PageConfig[]` | required | Navigation pages (see below) |
| `plugins` | `PluginManifest[]` | `[]` | Installed plugins (see Plugin catalog) |
| `theme` | `SaasTheme` | — | Visual theme (see Theme) |
| `defaultThemeMode` | `'light' \| 'dark'` | `'light'` | Initial color mode |
| `locale` | `LocaleConfig` | — | i18n setup (see i18n) |
| `auth` | `AuthConfig` | — | Auth adapter and login screen config |
| `organization` | `OrgConfig` | — | Multi-tenancy config |
| `billing` | `{ plans: PlanConfig[], stripePublishableKey? }` | — | Plans. `PlanConfig` only needs `{ id, name, features, prices: { monthly, yearly } }` — tier/currency/limits optional |
| `chat` | `ChatConfig` | — | AI chat assistant |
| `notifications` | `{ changelogUrl?: string }` | — | Notification bell config |
| `permissions` | `PermissionsConfig` | — | Feature flags + RBAC profiles |
| `verticalId` | `string` | — | Pre-selects the niche during onboarding |
| `settingsTabs` | `SettingsTab[]` | `[]` | Extra tabs injected into Settings |
| `showSettings` | `boolean` | `true` | Show built-in Settings page |
| `showBilling` | `boolean` | auto | Show built-in Billing page |
| `bottomNav` | `BottomNavItem[]` | auto | Mobile bottom nav items (max 5) |

---

### PageConfig

Each entry in `pages` defines one navigation item + one route.

```typescript
interface PageConfig {
  path: string                   // URL path, e.g. '/clients'
  label: string                  // Nav label
  icon: string                   // Lucide icon name (e.g. 'Users', 'Calendar', 'DollarSign')
  component: React.ComponentType // Page component (use createCrudPage, custom, or createPlaceholder)
  section?: 'main' | 'secondary' | 'settings'  // default: 'main'
  position?: number              // Sort order within section (auto-increments if omitted)
  badge?: string | number        // Nav badge (e.g. unread count)
  permission?: { feature: string; action: PermissionAction }  // Hide if user lacks permission
  children?: ChildPageConfig[]   // Dropdown (topbar) or collapsible (sidebar) sub-items
}
```

**Children example** — Cadastros dropdown:

```tsx
{
  path: '/registry',
  label: 'Cadastros',
  icon: 'ClipboardList',
  position: 8,
  component: createPlaceholder('Cadastros'),
  children: [
    { path: '/registry/services', label: 'Serviços', icon: 'Briefcase', component: createCrudPage(serviceEntity) },
    { path: '/registry/staff',    label: 'Equipe',   icon: 'UserCog',   component: createCrudPage(staffEntity) },
  ],
}
```

Children without a `component` are nav-only links (the parent handles their routes).

---

### Auth config

```typescript
auth: {
  adapter?: 'supabase' | 'mock' | AuthAdapter  // default: auto-detects from supabaseUrl
  requireAuth?: boolean          // Redirect to login if not authenticated (default: false)
  loginLogo?: ReactNode          // Custom logo on the login page
  loginLayout?: 'split' | 'centered'  // Login page layout (default: 'centered')
  loginTagline?: string          // Hero headline on split layout
  loginDescription?: string      // Hero body text on split layout
  showOAuth?: boolean            // Show OAuth buttons (default: true when providers listed)
  oauthProviders?: ('google' | 'github' | 'facebook' | 'apple')[]
}
```

**Pattern**: use `'supabase'` in production, fall back to `'mock'` when no URL is available:
```typescript
adapter: import.meta.env.VITE_SUPABASE_URL ? 'supabase' : 'mock',
```

---

### Theme config

```typescript
theme: {
  name: string              // Identifier (e.g. 'violet', 'emerald', 'rose')
  brand: string             // Primary color hex (e.g. '#7c3aed')
  radius?: 'sharp' | 'soft' | 'round'              // Border radius scale (default: 'soft')
  density?: 'compact' | 'comfortable' | 'spacious' // Spacing scale (default: 'comfortable')
  shadow?: 'none' | 'subtle' | 'medium' | 'bold'   // Shadow intensity
  font?: 'system' | 'inter' | 'dm-sans' | 'poppins' | 'geist' | 'plus-jakarta'
       | 'outfit' | 'nunito' | 'source-sans' | 'raleway' | 'manrope'
  sidebar?: {
    background: string     // e.g. '#1a0a2e'
    foreground: string     // e.g. '#ffffff'
    accent: string         // Active item highlight color
    accentForeground: string
    border?: string
    muted?: string
  }
  content?: {
    background: string     // Page content background
  }
}
```

**Common brand presets:**

| Name | Brand hex |
|---|---|
| violet | `#7c3aed` |
| rose | `#e11d48` |
| emerald | `#059669` |
| amber | `#d97706` |
| sky | `#0284c7` |
| slate | `#475569` |

---

### Locale / i18n config

```typescript
locale: {
  default?: string                                     // BCP-47 locale code (default: 'en')
  supported?: string[]                                 // Available locales for the user to choose
  translations?: Record<string, Record<string, string>> // { 'pt-BR': { 'key': 'value' } }
}
```

Translation files are plain key-value maps, namespaced by `<plugin-id>.<key>`:

```typescript
// src/i18n/index.ts
export const appTranslations = {
  en: {
    'app.tagline': 'Manage your business',
    'clients.title': 'Clients',
  },
  'pt-BR': {
    'app.tagline': 'Gerencie seu negócio',
    'clients.title': 'Clientes',
  },
}
```

Use the `tl()` helper for inline bilingual strings in the config itself:

```typescript
// src/i18n/tl.ts
export function tl(en: string, ptBR: string): string {
  // Returns the appropriate string based on current locale
  const locale = (window as any).__fayz_locale ?? 'pt-BR'
  return locale === 'pt-BR' ? ptBR : en
}
```

Use `tl()` for labels that appear in static config (page labels, plugin labels, permission descriptions).

---

### Permissions config

```typescript
permissions: {
  features: FeatureDeclaration[]   // Declare what features exist
  defaultProfiles: PermissionProfile[]  // Built-in RBAC roles
}

interface FeatureDeclaration {
  id: string    // e.g. 'clients', 'agenda', 'financial'
  label: string // Human-readable label
  group?: string // Optional grouping in the permissions UI
}

interface PermissionProfile {
  id: string
  name: string
  description?: string
  isSystem: boolean   // System profiles can't be deleted by tenants
  systemPermissions: SystemPermission[]  // 'manage_team' | 'manage_billing' | 'manage_settings' | 'manage_permissions'
  grants: Record<string, PermissionAction[]>  // { 'clients': ['read', 'create', 'edit', 'delete'] }
}
```

Gating a page behind a permission:
```typescript
{ path: '/financial', ..., permission: { feature: 'financial', action: 'read' } }
```

Gating a UI element:
```tsx
import { PermissionGate } from '@fayz-ai/saas-core'

<PermissionGate feature="clients" action="delete">
  <DeleteButton />
</PermissionGate>
```

---

## CRUD system — EntityDef + createCrudPage

Use `createCrudPage(entityDef)` to generate a full list/detail/create/edit page for any entity.

### EntityDef

```typescript
interface EntityDef<T = Record<string, any>> {
  name: string           // Singular (e.g. 'Client')
  namePlural?: string    // Plural (e.g. 'Clients')
  icon: string           // Lucide icon name
  layout?: 'default' | 'service' | 'product' | 'person' | 'location'  // Form layout preset
  displayField?: string  // Field key shown as the entity title (e.g. 'name')
  subtitleField?: string // Secondary field in the detail hero
  imageField?: string    // Field key with image URL
  defaultSort?: string   // Default sort column key
  defaultSortDir?: 'asc' | 'desc'
  fields: FieldDef[]     // All fields (see below)
  fieldGroups?: FieldGroup[]  // Named sections in forms/detail
  detailTabs?: DetailTab[]    // Extra tabs on the detail page
  data?: {
    table: string          // Supabase table name (in public schema by default)
    schema?: string        // Override schema (default: 'public')
    tenantScoped?: boolean // Add tenant_id filter automatically (default: true)
    tenantIdColumn?: string // Column name (default: 'tenant_id')
    searchColumns?: string[] // Columns included in text search
    selectColumns?: string   // Custom SELECT clause (e.g. '*, category:categories(name)')
    archetype?: 'person' | 'product' | 'service' | 'category' | 'order' | 'transaction' | 'schedule' | 'location'
    archetypeKind?: string   // Discriminator value in the archetype table (e.g. 'customer', 'staff')
    filters?: Record<string, string>  // Static WHERE conditions
    defaults?: Record<string, unknown> // Values merged into every create
    columnMap?: Record<string, string> // Rename DB columns to field keys
    cacheTTL?: number       // List query cache TTL in ms (default: 60 000)
  }
}
```

### FieldDef

```typescript
interface FieldDef {
  key: string           // Maps to DB column name (or use columnMap to remap)
  label: string         // Human-readable label
  type: FieldType       // See field types below
  required?: boolean
  placeholder?: string
  options?: string[] | { label: string; value: string }[]  // For 'select' and 'multiselect'
  min?: number          // For 'number'
  max?: number
  currency?: string     // For 'currency' type — ISO code (e.g. 'BRL', 'USD')
  showInTable?: boolean // Show as column in the list table (default: true)
  showInForm?: boolean  // Show in create/edit form (default: true)
  showInDetail?: boolean // Show in detail overview (default: true)
  sortable?: boolean    // Allow column sorting (default: true for text/number/date)
  searchable?: boolean  // Include in search
  group?: string        // Field group name (maps to fieldGroups)
  span?: 1 | 2          // Column span in two-column form layout
  inlineToggle?: boolean // Boolean toggle directly in table row (no modal needed)
  defaultValue?: any
  renderCell?: (value: any, row: any) => ReactNode  // Custom table cell renderer
}
```

### Field types

| Type | Description |
|---|---|
| `text` | Single-line text input |
| `email` | Email with validation |
| `phone` | Phone number |
| `url` | URL with validation |
| `image` | Image URL with preview |
| `number` | Numeric input |
| `currency` | Money — formatted with locale (set `currency` to ISO code) |
| `select` | Single option from `options` list |
| `multiselect` | Multiple options from `options` list |
| `date` | Date picker |
| `datetime` | Date + time picker |
| `time` | Time picker |
| `boolean` | Checkbox / toggle |
| `textarea` | Multi-line text |
| `color` | Color picker (hex) |

### Full EntityDef example

```typescript
// src/types/service.ts
import type { EntityDef } from '@fayz-ai/saas-core'

export interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number | null
  category_id: string | null
  is_active: boolean
}

export const serviceEntity: EntityDef<Service> = {
  name: 'Service',
  namePlural: 'Services',
  icon: 'Briefcase',
  layout: 'service',
  displayField: 'name',
  data: {
    table: 'services',
    archetype: 'service',
    archetypeKind: 'service',
    tenantScoped: true,
    searchColumns: ['name', 'description'],
    defaults: { is_active: true },
  },
  fields: [
    { key: 'name',             label: 'Name',     type: 'text',     required: true, span: 2 },
    { key: 'description',      label: 'Description', type: 'textarea', showInTable: false, span: 2 },
    { key: 'price',            label: 'Price',    type: 'currency', currency: 'BRL', required: true, showInTable: true },
    { key: 'duration_minutes', label: 'Duration (min)', type: 'number', showInTable: true },
    { key: 'is_active',        label: 'Active',   type: 'boolean', inlineToggle: true, showInTable: true },
  ],
}
```

---

## createArchetypeLookup — cross-entity search

Use this when a plugin needs a search dropdown to pick entities from another table (e.g., pick a service in an appointment, or a product in an invoice).

```typescript
import { createArchetypeLookup } from '@fayz-ai/saas-core'

// Look up any person kind
const clientLookup = createArchetypeLookup({ archetype: 'person', kind: 'customer' })
const staffLookup  = createArchetypeLookup({ archetype: 'person', kind: 'staff' })

// Look up services
const serviceLookup = createArchetypeLookup({ archetype: 'service' })

// Look up products
const productLookup = createArchetypeLookup({ archetype: 'product' })

// Look up multiple kinds in one dropdown
const contactLookup = createArchetypeLookup({
  archetype: 'person',
  kind: ['customer', 'supplier'],
  kindLabels: { customer: 'Client', supplier: 'Supplier' },
})
```

Pass lookups to plugins that need them:
```typescript
createAgendaPlugin({
  contactLookup: clientLookup,
  serviceLookup: serviceLookup,
  professionalLookup: staffLookup,
})
```

---

## Plugin catalog

Import from `@fayz-ai/saas-core/plugins/<name>`. Each plugin returns a `PluginManifest` that you add to the `plugins` array in `createSaasApp`.

---

### Dashboard plugin

Adds a home page (`/`) with a KPI card grid and custom sections.

```typescript
import { createDashboardPlugin } from '@fayz-ai/plugin-dashboard'

createDashboardPlugin({
  navPosition: 0,
  navIcon: 'LayoutDashboard',
  skipNavigation: false,   // set true if app provides its own '/' page

  currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },

  labels: {
    pageTitle: 'Dashboard',
    pageSubtitle: 'Business overview',
  },

  // Each metric is an async compute() returning { value, previousValue?, trend?, unit? }.
  // Rendered as a card grid with trend indicators. format: 'number' | 'currency' | 'percent' | 'duration'
  metrics: [
    {
      id: 'orders-open', label: 'Open Orders', icon: 'ShoppingCart',
      category: 'operations', format: 'number',
      defaultVisible: true, defaultOrder: 0,
      compute: async () => {
        const orders = await getShopProvider().listOrders({ status: 'open', limit: 200 })
        return { value: orders.length, trend: 'neutral' }
      },
    },
    {
      id: 'revenue-paid', label: 'Paid Revenue', icon: 'DollarSign',
      category: 'revenue', format: 'currency',
      defaultVisible: true, defaultOrder: 1,
      compute: async () => ({ value: 3240, previousValue: 2817, trend: 'up' }),
    },
  ],

  // Custom full-width sections rendered below the KPI grid
  sections: [
    { id: 'schedule', title: 'Today', zone: 'main', order: 1, component: TodayScheduleSection },
  ],
})
```

**Custom section component:**
```tsx
import type { DashboardSectionProps } from '@fayz-ai/saas-core/plugins/dashboard'

export function TodayScheduleSection({ onNavigate }: DashboardSectionProps) {
  // DashboardSectionProps: { onNavigate?: (route: string) => void }
  return <Card>...</Card>
}
```

---

### Agenda plugin

Full calendar and appointment management. Uses `v_bookings` view in the database.

```typescript
import { createAgendaPlugin } from '@fayz-ai/saas-core/plugins/agenda'

createAgendaPlugin({
  navPosition: 1,
  currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },

  // Calendar config
  defaultCalendarView: 'resourceTimeGridWeek',  // 'dayGridMonth' | 'timeGridWeek' | 'resourceTimeGridWeek' | 'listWeek'
  businessHours: { startTime: '08:00', endTime: '20:00' },
  slotDuration: 30,  // minutes

  // Database config (defaults work for standard setups)
  bookingKind: 'appointment',
  orderKind: 'service_order',
  professionalKind: 'staff',
  clientKind: 'customer',
  autoCreateOrder: true,

  // Cross-plugin lookups
  contactLookup: clientLookup,
  serviceLookup: serviceLookup,
  professionalLookup: staffLookup,

  // Enable modules
  modules: {
    workingHours: true,
    confirmations: true,
    conflictDetection: true,
    dragAndDrop: true,
    locationSelection: false,   // Enable if multi-location
    financial: false,           // Enable + add financialBridge for financial integration
  },

  labels: {
    pageTitle: 'Agenda',
    pageSubtitle: 'Schedule and appointment management',
  },

  // Override booking statuses
  statuses: [
    { value: 'scheduled', label: 'Scheduled', color: '#6366f1' },
    { value: 'confirmed', label: 'Confirmed', color: '#3b82f6' },
    { value: 'completed', label: 'Completed', color: '#10b981', availableWhen: 'today_or_past' },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
    { value: 'no_show',   label: 'No Show',   color: '#6b7280', availableWhen: 'today_or_past' },
  ],
})
```

**Financial bridge** — link agenda bookings to financial records:
```typescript
import { createFinancialBridge } from '@fayz-ai/saas-core/plugins/agenda'

const financialBridge = createFinancialBridge()

createAgendaPlugin({ ..., financialBridge, modules: { financial: true } })
createFinancialPlugin({ ..., onBookingClick: (orderId) => navigate(`/agenda?order=${orderId}`) })
```

---

### Financial plugin

Accounts payable/receivable, cash registers, statements, commissions.

```typescript
import { createFinancialPlugin } from '@fayz-ai/saas-core/plugins/financial'

createFinancialPlugin({
  navPosition: 4,
  currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },

  modules: {
    payables: true,
    receivables: true,
    cashRegisters: true,
    statements: true,
    commissions: false,
    cards: false,
  },

  // Link item types to entity lookups (enables search in invoice forms)
  itemTypes: [
    { value: 'service', label: 'Service' },
    { value: 'product', label: 'Product' },
  ],
  entityLookups: {
    service: serviceLookup,
    product: productLookup,
  },
  contactLookup: clientLookup,

  labels: {
    pageTitle: 'Financial',
    pageSubtitle: 'Cash flow and financial management',
  },
})
```

---

### Inventory plugin

Product stock tracking and movement history.

```typescript
import { createInventoryPlugin } from '@fayz-ai/saas-core/plugins/inventory'

createInventoryPlugin({
  navPosition: 3,
  currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  labels: {
    pageTitle: 'Inventory',
    pageSubtitle: 'Stock tracking and product management',
  },
})
```

---

### CRM plugin

Lead pipeline, deals, quotes, activity feed.

```typescript
import { createCrmPlugin } from '@fayz-ai/saas-core/plugins/crm'

createCrmPlugin({
  navPosition: 5,
  currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },

  modules: {
    quotes: true,
    activities: true,
    pipeline: true,
  },

  // Lead sources
  leadSources: [
    { value: 'instagram', label: 'Instagram' },
    { value: 'referral',  label: 'Referral' },
    { value: 'google',    label: 'Google' },
  ],

  // Deal stages
  dealStages: [
    { name: 'Prospecting', color: '#6366f1', probability: 20 },
    { name: 'Proposal',    color: '#f59e0b', probability: 50 },
    { name: 'Negotiation', color: '#3b82f6', probability: 75 },
    { name: 'Won',         color: '#10b981', probability: 100 },
    { name: 'Lost',        color: '#ef4444', probability: 0 },
  ],

  itemTypes: [
    { value: 'service', label: 'Service' },
    { value: 'product', label: 'Product' },
  ],
  entityLookups: {
    service: serviceLookup,
    product: productLookup,
  },
  contactLookup: clientLookup,

  // Auto-convert lead to client on approval
  clientConversion: {
    archetypeKind: 'customer',
    extensionTable: 'clients',
    fkColumn: 'person_id',
  },
})
```

---

### Reports plugin

Pre-built report catalog with filtering and drill-down.

```typescript
import { createReportsPlugin } from '@fayz-ai/saas-core/plugins/reports'

createReportsPlugin({
  navPosition: 9,
  currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  labels: {
    pageTitle: 'Reports',
    pageSubtitle: 'Analytics and business insights',
  },
})
```

Reports are auto-populated based on which other plugins are installed. Agenda → scheduling reports, Financial → revenue reports.

---

### Tasks plugin

Widget-based task manager (no dedicated page). Adds a floating task panel and a task quick-add.

```typescript
import { createTasksPlugin } from '@fayz-ai/saas-core/plugins/tasks'

createTasksPlugin({
  labels: {
    drawerTitle: 'Tasks',
    settingsTitle: 'Tasks',
    quickAddPlaceholder: 'Add a task...',
  },
})
```

---

### Custom Forms plugin

Settings-based form builder. Adds a Forms section in Settings (no main nav page).

```typescript
import { createCustomFormsPlugin } from '@fayz-ai/saas-core/plugins/custom_forms'

createCustomFormsPlugin({
  labels: {
    settingsLabel: 'Custom Forms',
  },
})
```

---

## Vertical-specific archetypes

The database uses shared archetype tables in the `saas_core` schema. Consumer apps extend them via project-specific extension tables joined by `person_id`, `product_id`, etc.

| Archetype | Table | Common kinds |
|---|---|---|
| `person` | `saas_core.persons` | `customer`, `staff`, `supplier`, `contact` |
| `product` | `saas_core.products` | `retail`, `wholesale` |
| `service` | `saas_core.services` | `treatment`, `consultation` |
| `category` | `saas_core.categories` | `service_category`, `product_category` |
| `order` | `saas_core.orders` | `service_order`, `product_order` |
| `transaction` | `saas_core.transactions` | `payment`, `refund` |
| `schedule` | `saas_core.schedules` | `working_hours`, `block` |
| `location` | `saas_core.locations` | `branch`, `room` |

**EntityDef for a person archetype extension:**
```typescript
export const clientEntity: EntityDef = {
  name: 'Client',
  icon: 'User',
  displayField: 'name',
  data: {
    table: 'clients',          // Extension table in public schema
    archetype: 'person',
    archetypeKind: 'customer', // persons.kind = 'customer'
    tenantScoped: true,
    searchColumns: ['name', 'email', 'phone'],
  },
  fields: [
    { key: 'name',  label: 'Name',  type: 'text',  required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'phone' },
    { key: 'is_active', label: 'Active', type: 'boolean', inlineToggle: true },
  ],
}
```

---

## Environment variables

Required in `.env.local` (generated apps) or `process.env` / `import.meta.env`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

When these are absent, the SDK automatically uses mock adapters (useful for rapid prototyping without a database).

---

## Project structure

Generated apps follow this layout:

```
src/
├── App.tsx              # createSaasApp() — the entire app config
├── main.tsx             # ReactDOM.createRoot + <App />
├── components/
│   └── Logo.tsx         # Brand logo component
├── types/
│   ├── client.ts        # clientEntity: EntityDef
│   ├── service.ts       # serviceEntity: EntityDef
│   └── registry.ts      # Other entities (staff, supplier, category, etc.)
├── pages/
│   └── dashboard/
│       ├── TodayScheduleSection.tsx   # Custom dashboard sections
│       └── QuickActionsSection.tsx
├── i18n/
│   ├── index.ts         # appTranslations object
│   └── tl.ts            # tl() helper for inline bilingual strings
├── integrations/
│   └── supabase/
│       ├── client.ts    # export const supabase = createClient(...)
│       └── types.ts     # Generated DB types (optional)
└── theme.ts             # beautyTheme / SaasTheme object (optional, or inline in App.tsx)
```

---

## Complete examples

### Minimal SaaS app (appointments business)

```tsx
export const App = createSaasApp({
  name: 'Studio App',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  auth: { adapter: 'supabase', requireAuth: true, loginLayout: 'split' },
  layout: 'topbar',
  theme: { name: 'violet', brand: '#7c3aed', radius: 'soft' },
  locale: { default: 'pt-BR', supported: ['en', 'pt-BR'] },

  plugins: [
    createDashboardPlugin({ navPosition: 0 }),
    createAgendaPlugin({
      navPosition: 1,
      contactLookup: createArchetypeLookup({ archetype: 'person', kind: 'customer' }),
      serviceLookup: createArchetypeLookup({ archetype: 'service' }),
      professionalLookup: createArchetypeLookup({ archetype: 'person', kind: 'staff' }),
    }),
    createFinancialPlugin({ navPosition: 2 }),
    createReportsPlugin({ navPosition: 3 }),
  ],

  pages: [
    {
      path: '/clients', label: 'Clients', icon: 'Users',
      component: createCrudPage(clientEntity),
    },
    {
      path: '/registry', label: 'Registry', icon: 'ClipboardList', position: 8,
      component: createPlaceholder('Registry'),
      children: [
        { path: '/registry/services', label: 'Services', icon: 'Briefcase', component: createCrudPage(serviceEntity) },
        { path: '/registry/staff',    label: 'Staff',    icon: 'UserCog',   component: createCrudPage(staffEntity) },
      ],
    },
  ],
})
```

---

## @fayz-ai/shop — internal shop domain/provider package

`@fayz-ai/shop` is the internal ecommerce domain/provider layer: products, orders,
customers, discounts, catalog mocks, tenant scoping, and backend adapters. It is not
the customer-facing storefront UI package. Generated/customer apps should still treat
`@fayz-ai/sdk` as the only public required package; shop internals are reached through
local workspace aliases/templates until dogfood proves a stable public boundary.

For real app data access, prefer the public SDK path (`@fayz-ai/sdk/shop` now,
eventually `fayz.shop.*`) so the app repo does not own provider plumbing.

### Tables required (add to your Supabase migrations)

```sql
shop_products, shop_product_images, shop_categories,
shop_orders, shop_order_items,
shop_customers, shop_discounts
```

All tables have `tenant_id` for multi-tenant isolation (same RLS pattern as `saas_core`).
A ready-made migration ships with the SDK: `packages/shop/migrations/0001_shop_tables.sql`
(also in `saas-core/supabase/migrations/20260610000001_shop_tables.sql`). It includes RLS
policies, a customer-stats trigger, and the `shop-images` storage bucket.

### Provider API

```typescript
import {
  getShopProvider, setShopProvider,
  createSupabaseShopProvider, createMockShopProvider,
  setShopTenantResolver,
} from '@fayz-ai/shop'

// Provider auto-selects: Supabase when initialized, mock in dev/demo.
// The choice upgrades automatically once setGlobalSupabaseClient() runs.
const provider = getShopProvider()

// Override explicitly (e.g. in tests)
setShopProvider(createMockShopProvider())

// Tenant scoping: @fayz-ai/shop has no dependency on @fayz-ai/saas, so the host
// registers a resolver. createShopPlugin() does this automatically using
// useOrganizationStore — only call this yourself when using @fayz-ai/shop
// WITHOUT the plugin:
setShopTenantResolver(() => myTenantId)

// Core operations
await provider.listProducts({ status: 'active', search: 'shirt', limit: 20 })
await provider.createProduct({ name: 'T-Shirt', price: 59.90, status: 'active' })
await provider.updateProduct(id, { inventoryCount: 10 })
await provider.deleteProduct(id)

await provider.listOrders({ financialStatus: 'pending', limit: 50 })
await provider.updateOrder(id, { financialStatus: 'paid', fulfillmentStatus: 'fulfilled' })

await provider.listCustomers({ search: 'João', limit: 20 })
await provider.listDiscounts({ status: 'active' })
```

### Key types

```typescript
// Products
Product { id, name, slug, price, compareAtPrice, currency, status, inventoryCount, sku, images, categoryId }
ProductStatus: 'draft' | 'active' | 'archived'

// Orders
Order { id, orderNumber, status, financialStatus, fulfillmentStatus, total, items, customerName }
OrderStatus: 'open' | 'archived' | 'cancelled'
FinancialStatus: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'voided'
FulfillmentStatus: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled'

// Customers
ShopCustomer { id, firstName, lastName, email, phone, ordersCount, totalSpent }

// Discounts
Discount { id, title, code, type, value, status, timesUsed, usageLimit }
DiscountType: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
```

`plugin-shop` installs `@fayz-ai/shop` and exposes the full admin UI (Products, Orders, Customers, Discounts tabs). A consumer app only needs:

```typescript
import { createShopPlugin } from '@fayz-ai/plugin-shop'

plugins: [
  createShopPlugin({ navPosition: 1, currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' } }),
]
```

---

### E-commerce app (with shop plugin)

> Shop, Menu, and Tables plugins live in `@fayz-ai/plugin-*` (fayz-sdk), not in saas-core.

```tsx
import { createShopPlugin } from '@fayz-ai/plugin-shop'
import { createInventoryPlugin } from '@fayz-ai/saas-core/plugins/inventory'
import { createCrmPlugin } from '@fayz-ai/saas-core/plugins/crm'
import { createReportsPlugin } from '@fayz-ai/saas-core/plugins/reports'

export const App = createSaasApp({
  name: 'My Store',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  auth: { adapter: 'supabase', requireAuth: true },
  layout: 'sidebar',
  theme: { name: 'emerald', brand: '#059669', radius: 'round' },

  plugins: [
    createDashboardPlugin({ navPosition: 0 }),
    createShopPlugin({
      navPosition: 1,
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      modules: { customers: true, inventory: true },
    }),
    createInventoryPlugin({ navPosition: 2 }),
    createCrmPlugin({ navPosition: 3 }),
    createReportsPlugin({ navPosition: 4 }),
  ],

  pages: [
    {
      path: '/products', label: 'Products', icon: 'Package',
      component: createCrudPage(productEntity),
    },
    {
      path: '/categories', label: 'Categories', icon: 'Tag',
      component: createCrudPage(categoryEntity),
    },
  ],
})
```

### Restaurant app (with menu + tables plugins)

```tsx
import { createMenuPlugin }   from '@fayz-ai/plugin-menu'
import { createTablesPlugin } from '@fayz-ai/plugin-tables'
import { createFinancialPlugin } from '@fayz-ai/saas-core/plugins/financial'
import { createReportsPlugin } from '@fayz-ai/saas-core/plugins/reports'

export const App = createSaasApp({
  name: 'Resto',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  auth: { adapter: 'supabase', requireAuth: true, loginLayout: 'centered' },
  layout: 'sidebar',
  theme: { name: 'amber', brand: '#d97706', radius: 'soft', font: 'poppins' },
  locale: { default: 'pt-BR', supported: ['pt-BR', 'en'] },

  plugins: [
    createDashboardPlugin({ navPosition: 0 }),
    createMenuPlugin({
      navPosition: 1,
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      modules: { modifiers: true, deliveryPricing: false },
    }),
    createTablesPlugin({
      navPosition: 2,
      modules: { reservations: true, sessionHistory: true },
      defaultZones: [
        { name: 'Salão', color: '#f59e0b' },
        { name: 'Varanda', color: '#10b981' },
      ],
    }),
    createFinancialPlugin({ navPosition: 3 }),
    createReportsPlugin({ navPosition: 4 }),
  ],

  pages: [],
})
```

---

## Utility functions

```typescript
import { createCrudPage, createPlaceholder, createArchetypeLookup } from '@fayz-ai/saas-core'

// Auto-generates list + detail + create + edit pages from an EntityDef
createCrudPage(entityDef)

// Quick placeholder for pages under development
createPlaceholder('Marketing', 'Campaigns, loyalty programs, and client engagement')

// Search dropdown for any archetype
createArchetypeLookup({ archetype: 'person', kind: 'customer' })
```

---

## Supabase database schema overview

The core data lives in the `saas_core` schema (not the public schema). The public schema holds:
- App-specific extension tables (e.g., `clients`, `services`, `products`)
- Financial tables (`financial_movements`, `payment_methods`)
- Views that join archetype tables with extensions (e.g., `v_bookings`)

RLS is applied via `tenant_id` on all tables. The auth user → tenant mapping is in `saas_core.tenant_members`.

**Key views:**
- `v_bookings` — appointments with client name, professional name, services list, totals
- `v_clients` — persons with kind='customer' joined with client extension data
- `v_staff` — persons with kind='staff' joined with staff extension data

---

## @fayz-ai/storefront — internal customer-facing ecommerce template

The storefront counterpart of the SaaS app shell: a Shopify-style **public store**
(catalog, filters, cart, checkout, purchase history) — not an admin. Use it when
the project is an online store the *customers* visit; use `createShopPlugin`
inside the merchant back office. `@fayz-ai/storefront` owns front-end store assembly;
`@fayz-ai/shop` owns domain/provider primitives; `@fayz-ai/sdk/shop` owns Fayz-backed
data access.

```typescript
import { createStorefrontApp } from '@fayz-ai/storefront'

export const App = createStorefrontApp({
  name: 'Aurora Goods',
  currency: 'BRL',                          // default 'BRL'
  locale: 'pt-BR',                          // default 'pt-BR'
  shipping: { flatRate: 19.9, freeAbove: 300 },
  // Omit both for mock mode (16-product deterministic catalog):
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  // features: { discounts: true, accounts: true },
})
```

Routes (hash-based, built in): `/` home (when `home` configured, else catalog) ·
`/catalog` · `/product/:slug` · `/checkout` · `/order/:id` confirmation ·
`/account` my purchases (email sign-in via the shared @fayz-ai/auth adapter).

### Templates (recreated from Nuvemshop patterns — see docs/storefront-templates-research.md)

```typescript
import { createStorefrontApp, storefrontTemplates, sertaoTemplate } from '@fayz-ai/storefront'

// Option A — use a template as-is:
const t = storefrontTemplates.atelier   // 'mare' | 'sertao' | 'volt' | 'atelier'
createStorefrontApp({ name: 'Minha Loja', theme: t.theme, announcement: t.announcement, home: t.home('Minha Loja') })

// Option B — personalize (colors, fonts, radius, hero variant, sections — saas-core style):
createStorefrontApp({
  name: 'Tannat',
  theme: { ...sertaoTemplate.theme, colors: { ...sertaoTemplate.theme.colors, primary: '343 55% 30%' },
           font: { heading: 'Cormorant Garamond', body: 'Cormorant Garamond', fallback: 'serif' } },
  home: { sections: [ /* hero | categories | products | benefits | banner | manifesto | testimonials | newsletter */ ] },
})
```

Template personalities: `mare` (airy fashion, Rio), `sertao` (editorial serif, Uyuni),
`volt` (bold tech with dark search header, Brasília), `atelier` (classic premium, Flex).

### Per-store catalog + auth

```typescript
import { buildMockCatalog } from '@fayz-ai/shop/catalog'

const catalog = buildMockCatalog({
  categories: [{ name: 'Tintos' }],
  products: [{ name: 'Tannat Reserva', description: '…', price: 129.9, inventory: 36, sku: 'TIN-001', category: 'Tintos' }],
  discounts: [{ code: 'TANNAT15', percent: 15 }],
})
createStorefrontApp({ name: 'Tannat', catalog })   // mock mode uses this store's own products
```

Customer auth uses the SAME `AuthAdapter` contract as `createSaasApp`
(`auth: { adapter: 'mock' | 'supabase' | customAdapter }`, default mock). Checkout and the
account page both go through `establishCustomerSession()` — buyer is signed in after purchase.

**Reference stores:** `../shopfront` (Aurora Goods, all 4 templates via `VITE_TEMPLATE`),
`../tannat-store` (wine, personalized sertão), `../pulse-store` (sneakers, personalized volt).

What it includes out of the box:
- Catalog with search, category / price-range / in-stock filters, 4 sort modes
- Product cards with Sale/Sold-out badges; product detail with quantity selector
- Cart drawer (zustand, persisted) with discount codes and shipping rules
- Checkout (contact + address + mock payment) → creates the order via the shop
  provider and marks it paid → confirmation page → "Minhas compras"
- Every interactive element carries a `data-testid` (exported as `TID`) and every
  price a `data-price` attribute — Playwright suites assert against those

Composable exports for custom layouts: `StorefrontHeader`, `ProductGrid`,
`ProductCard`, `FiltersPanel`, `CartDrawer`, `Price`, page components, the
`useCartStore`/`useSessionStore`/`useCatalogStore` stores, and hooks
(`useProducts`, `useProduct`, `useCategories`, `useMyOrders`, `useDiscountValidator`).

**Reference app:** `../shopfront` (Aurora Goods) — includes the full Playwright
e2e suite (19 tests). Copy its `vite.config.ts` + `tsconfig.json` + `tailwind.config.ts`
when scaffolding: the tailwind `content` globs MUST include
`'../fayz-sdk/packages/storefront/src/**/*.{ts,tsx}'` or all storefront styles purge.

---

## Mock mode

When `VITE_SUPABASE_URL` is not set, all adapters fall back to in-memory mock data. This allows running the app without any database.

Explicitly force mock mode:
```typescript
auth: { adapter: 'mock' },
organization: { adapter: 'mock' },
```

---

## Quick reference: all icons

Use any [Lucide icon name](https://lucide.dev) in the `icon` field. Common ones used in generated apps:

`LayoutDashboard`, `Calendar`, `Users`, `Package`, `DollarSign`, `BarChart2`, `Settings`,
`ClipboardList`, `Briefcase`, `UserCog`, `Building2`, `Tag`, `Wrench`, `Globe`,
`ShoppingCart`, `Truck`, `Star`, `Megaphone`, `MessageSquare`, `Bell`, `Search`,
`Plus`, `Filter`, `Download`, `Upload`, `Link`, `Map`, `Clock`, `CheckSquare`
