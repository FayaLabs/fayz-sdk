> **ARCHIVED 2026-07-06** — superseded by [PLUGINS.md](../PLUGINS.md). Historical reference only; do not follow operationally.

# Contributing to fayz-sdk

fayz-sdk is an open monorepo. The plugin system is designed for the npm ecosystem — anyone can publish a plugin and it will work in any Fayz-generated app.

## Monorepo setup

```bash
git clone https://github.com/fayalabs/fayz-sdk
cd fayz-sdk
pnpm install       # requires pnpm >= 9
pnpm build         # build all packages
```

Run a specific package in watch mode:

```bash
pnpm -F @fayz-ai/plugin-crm dev
```

## Repository layout

```
packages/
  core/       @fayz-ai/core     — pure TS foundation (no React)
  auth/       @fayz-ai/auth     — auth adapters + React hooks
  ui/         @fayz-ai/ui       — Radix + Tailwind components
  saas/       @fayz-ai/saas     — tenancy, billing, permissions
plugins/
  plugin-*/   @fayz-ai/plugin-* — vertical feature plugins
cli/          @fayz-ai/cli      — scaffold tooling
docs/                        — this directory
examples/
  beauty/                    — canonical beauty SaaS reference
  restaurant/                — canonical restaurant SaaS reference
```

## Creating a plugin

Scaffold a new plugin with the CLI:

```bash
pnpm create @fayz-ai/plugin my-plugin
# or inside the monorepo:
pnpm -F @fayz-ai/cli scaffold plugin my-plugin
```

### Plugin structure

Every plugin must follow this layout:

```
plugins/plugin-my-plugin/
├── src/
│   ├── index.ts          # exports: { createMyPlugin }
│   ├── MyPluginPage.tsx  # main React component (lazy)
│   ├── registries/       # EntityDef definitions
│   ├── locales/
│   │   ├── en.ts
│   │   └── pt-BR.ts      # required minimum locales
│   └── migrations/       # SQL files (if DB tables needed)
├── package.json
├── tsup.config.ts
└── tsconfig.json
```

### Plugin manifest contract

```typescript
import { definePlugin } from '@fayz-ai/core'

export function createMyPlugin(options?: MyPluginOptions) {
  return definePlugin({
    id: 'my-plugin',                     // unique, kebab-case
    name: 'My Plugin',
    icon: 'Puzzle',                      // Lucide icon name
    version: '1.0.0',
    defaultEnabled: true,
    scaffolds: ['saas', 'ecommerce'],    // which scaffold types this targets
    navigation: [
      {
        section: 'main',
        position: 10,
        label: 'My Plugin',
        route: '/my-plugin',
        icon: 'Puzzle',
      },
    ],
    routes: [
      {
        path: '/my-plugin',
        component: MyPluginPage,
      },
    ],
    widgets: [],
    locales: {
      en: { 'my-plugin.title': 'My Plugin' },
      'pt-BR': { 'my-plugin.title': 'Meu Plugin' },
    },
  })
}
```

### package.json requirements

```json
{
  "name": "@scope/fayz-plugin-my-plugin",
  "keywords": ["fayz-plugin", "fayz"],
  "peerDependencies": {
    "@fayz-ai/core": ">=1.0.0",
    "react": ">=18.0.0"
  }
}
```

The `fayz-plugin` keyword makes the plugin discoverable in the Fayz marketplace.

## Scaffold types

Plugins declare which scaffold types they target via `scaffolds`:

| Value          | Description                              |
|----------------|------------------------------------------|
| `saas`         | Multi-tenant SaaS (appointments, CRM, …) |
| `ecommerce`    | Online store (cart, checkout, catalog)   |
| `landing_page` | Single-page marketing site               |
| `website`      | Multi-page informational site            |

A plugin with no `scaffolds` field works in all contexts.

## Widget zones

Use `WidgetZone` constants instead of magic strings:

```typescript
import { WidgetZone } from '@fayz-ai/core'

widgets: [
  {
    id: 'my-widget',
    zone: WidgetZone.TOPBAR_END,   // not 'shell.topbar.end'
    component: MyWidget,
  },
]
```

Available zones: `SIDEBAR_BEFORE_NAV`, `SIDEBAR_FOOTER`, `TOPBAR_START`, `TOPBAR_END`, `PAGE_BEFORE`, `PAGE_AFTER`, `SETTINGS_BEFORE`, `SETTINGS_AFTER`, `FLOATING`.

## i18n requirements

Every user-facing string must have both `en` and `pt-BR` translations. Use the `useTranslation` hook inside components:

```typescript
import { useTranslation } from '@fayz-ai/core'

const { t } = useTranslation()
// t('my-plugin.title') → 'My Plugin' or 'Meu Plugin'
```

Keys must be namespaced by plugin id: `my-plugin.something`.

## Data providers

For CRUD entities, bind a data provider in the entity definition:

```typescript
import { createSupabaseProvider } from '@fayz-ai/core'

export const myEntity: EntityDef<MyType> = {
  name: 'Item',
  displayField: 'name',
  data: {
    table: 'my_items',
    tenantScoped: true,
  },
  fields: [...],
}
```

In mock/test mode `createMockProvider()` is automatically used when no Supabase client is configured.

## Testing

Run typecheck for a single package:

```bash
pnpm -F @fayz-ai/plugin-my-plugin typecheck
```

Build all packages to catch cross-package issues:

```bash
pnpm build
```

## Publishing a plugin to npm

1. Ensure `"keywords": ["fayz-plugin"]` is in package.json.
2. Run `pnpm changeset` to create a changeset entry.
3. Push — the CI release workflow publishes automatically on merge to `main`.

For external plugins (outside this repo), publish to npm normally:

```bash
npm publish --access public
```

Consumers install it like any other npm package:

```bash
npm install @my-org/fayz-plugin-my-plugin
```

And register it in their app:

```typescript
import { createMyPlugin } from '@my-org/fayz-plugin-my-plugin'

const App = createSaasApp({
  plugins: [createMyPlugin()],
})
```

## Code review checklist

- [ ] Plugin id is unique and follows `kebab-case`
- [ ] Both `en` and `pt-BR` locales provided
- [ ] No hardcoded strings outside locale files
- [ ] Widget zones use `WidgetZone.*` constants
- [ ] `scaffolds` declared if plugin is scaffold-specific
- [ ] `peerDependencies` lists `@fayz-ai/core` with a semver range
- [ ] README explains config options and setup
- [ ] Changeset file included if modifying an existing package

## Versioning

fayz-sdk uses [Changesets](https://github.com/changesets/changesets) for independent package versioning.

- Breaking API change → major bump
- New feature (backward compatible) → minor bump
- Bug fix → patch bump
- A deprecated API must stay for at least one minor release with a `console.warn` before removal

Generated apps pin with `^` (`"@fayz-ai/core": "^1.0.0"`) and receive non-breaking updates automatically.
