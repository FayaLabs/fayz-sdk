# @fayz-ai/core

> The headless kernel that turns plugin manifests into a running app.

[![npm](https://img.shields.io/npm/v/@fayz-ai/core.svg)](https://www.npmjs.com/package/@fayz-ai/core)
[![license](https://img.shields.io/npm/l/@fayz-ai/core.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

A salon, a restaurant, and a clinic are the same engine with different plugins enabled. `@fayz-ai/core` is that engine — headless and UI-free. It defines the plugin contract, the entity/CRUD model, the data-provider abstraction, and the manifest format that describes an entire app as data. Plugins declare what they are; core resolves them into navigation, routes, widgets, and tools at runtime.

The bet: a SaaS app should be composable and portable, not hand-wired. Swap Supabase for the Fayz API or a mock with one provider call. Describe an app as a manifest and render it. Register an entity once and get list/form/detail behavior everywhere. Core is the substrate that makes plugins "snap in."

## What's inside
- **Plugin runtime** — `definePlugin`, `resolvePluginRuntime`, `getWidgetsForZone`, `getDashboardWidgets`, `PluginRuntimeProvider`, `PLUGIN_API_VERSION`
- **Data providers** — `createSupabaseProvider`, `createFayzApiProvider`, `createMockProvider`, `createArchetypeProvider`, `withCache`, `resolveDataProvider` over one `DataProvider` interface
- **Entity + registry** — `registerEntity`, `getEntityByKey`, and the uniform `Registry` for components, blocks, pages, metrics, scaffolds, and plugin factories
- **App manifest** — `defineApp`, `renderApp`, `migrateManifest`, `validateManifest`, JSON schema, and a versioned migration runner
- **Blocks** — `BlockRenderer` / `renderBlocks`, the universal page primitive
- **i18n + router** — `I18nProvider`, `useTranslation`, `hashRouterAdapter`, `windowRouterAdapter`
- **Event bus + utils** — `eventBus`, `useOnEvent`, `formatCurrency`, `exportCSV`, tenant context (`setActiveTenantId`)

## Install
```bash
npm install @fayz-ai/core
```
Peer deps: `react`, `react-dom` (^18 or ^19).

## Usage
```ts
import { definePlugin, createSupabaseProvider } from '@fayz-ai/core'

const provider = createSupabaseProvider({ url, anonKey })

export const crmPlugin = definePlugin({
  id: 'crm',
  navigation: [{ label: 'Clients', path: '/clients' }],
  entities: [/* declarative data models */],
})
```

## Part of the Fayz SDK
The headless core. `@fayz-ai/auth`, `@fayz-ai/ui`, and `@fayz-ai/saas` build the running app on top of it.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#core) for current gaps, missing features, and good first issues.
