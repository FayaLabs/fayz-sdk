# Migration from @fayz/saas-core

This guide covers moving an existing app from `@fayz/saas-core` to the fayz-sdk packages.

## Why migrate

`@fayz/saas-core` is a monolithic package — your app carries the full weight even if you only need billing or CRM. fayz-sdk splits the same functionality into independent packages you install only what you need.

## Package mapping

| saas-core import | fayz-sdk package | Notes |
|---|---|---|
| `createSaasApp` | `@fayz/saas` | Same API |
| `createCrudPage` | `@fayz/saas` | Same API |
| `createArchetypeLookup` | `@fayz/saas` | Same API |
| `EntityDef`, `FieldDef` | `@fayz/core` | Same shape |
| `PluginManifest` | `@fayz/core` | Same shape |
| `definePlugin` | `@fayz/core` | Same API |
| `DataProvider` | `@fayz/core` | Same interface |
| `createSupabaseProvider` | `@fayz/core` | Same API |
| `@fayz/saas-core/plugins/crm` | `@fayz/plugin-crm` | Individual package |
| `@fayz/saas-core/plugins/agenda` | `@fayz/plugin-agenda` | Individual package |
| `@fayz/saas-core/plugins/financial` | `@fayz/plugin-financial` | Individual package |
| `@fayz/saas-core/plugins/inventory` | `@fayz/plugin-inventory` | Individual package |
| `@fayz/saas-core/plugins/dashboard` | `@fayz/plugin-dashboard` | Individual package |
| `@fayz/saas-core/plugins/tasks` | `@fayz/plugin-tasks` | Individual package |
| `@fayz/saas-core/plugins/reports` | `@fayz/plugin-reports` | Individual package |
| `@fayz/saas-core/plugins/forms` | `@fayz/plugin-forms` | Individual package |

## Step 1 — Install new packages

```bash
npm install @fayz/core @fayz/auth @fayz/ui @fayz/saas
npm install @fayz/plugin-crm @fayz/plugin-agenda   # add only plugins you use
npm uninstall @fayz/saas-core
```

## Step 2 — Update App.tsx imports

```diff
- import { createSaasApp, createCrudPage, createArchetypeLookup } from '@fayz/saas-core'
- import { createCrmPlugin } from '@fayz/saas-core/plugins/crm'
- import { createAgendaPlugin, createFinancialBridge } from '@fayz/saas-core/plugins/agenda'
- import { createFinancialPlugin, createSafeFinancialProvider } from '@fayz/saas-core/plugins/financial'

+ import { createSaasApp, createCrudPage, createArchetypeLookup } from '@fayz/saas'
+ import { createCrmPlugin } from '@fayz/plugin-crm'
+ import { createAgendaPlugin, createFinancialBridge } from '@fayz/plugin-agenda'
+ import { createFinancialPlugin, createSafeFinancialProvider } from '@fayz/plugin-financial'
```

Entity definitions (`EntityDef`) still import from `@fayz/saas-core` if you prefer, or switch to `@fayz/core`:

```diff
- import type { EntityDef } from '@fayz/saas-core'
+ import type { EntityDef } from '@fayz/core'
```

## Step 3 — Update vite.config.ts for local development

Add aliases so Vite resolves fayz-sdk from source in dev:

```typescript
import { existsSync } from 'fs'
import { resolve } from 'path'

const fayzSdk = resolve(__dirname, '../fayz-sdk')
const useLocalSdk = existsSync(resolve(fayzSdk, 'packages/core/src/index.ts'))

export default defineConfig({
  resolve: {
    alias: {
      ...(useLocalSdk ? {
        '@fayz/core': resolve(fayzSdk, 'packages/core/src'),
        '@fayz/auth': resolve(fayzSdk, 'packages/auth/src'),
        '@fayz/ui':   resolve(fayzSdk, 'packages/ui/src'),
        '@fayz/saas': resolve(fayzSdk, 'packages/saas/src'),
        '@fayz/plugin-crm': resolve(fayzSdk, 'plugins/plugin-crm/src'),
        // ... add other plugins
      } : {}),
    },
    conditions: ['source', 'browser', 'module', 'jsnext:main', 'jsnext'],
  },
  optimizeDeps: {
    exclude: useLocalSdk
      ? ['@fayz/core', '@fayz/auth', '@fayz/ui', '@fayz/saas', '@fayz/plugin-crm']
      : [],
  },
})
```

## Step 4 — Verify

```bash
npm run dev
# open localhost and log in — the app should render identically
```

## No breaking changes in the config

`createSaasApp` in `@fayz/saas` accepts the exact same config object as `createSaasApp` from `@fayz/saas-core`. No changes needed to your app config, plugins array, permissions, or theme.

## Notes on workspace development

If your consumer app lives alongside fayz-sdk in a pnpm workspace, add the fayz-sdk workspace packages to `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "plugins/*"
  - "../../my-app"   # relative path from fayz-sdk root
```

Then run `pnpm install` from the fayz-sdk root to link everything.
