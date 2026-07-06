# Fayz SDK

> Open-source foundation for building professional, end-to-end SaaS, ecommerce, and storefront products — not throwaway prototypes.

[![license](https://img.shields.io/npm/l/@fayz-ai/core.svg)](LICENSE)

Fayz turns "one abstraction set → N vertical products" into reality. A new product is a **composition** — config + plugins + theme — rendered from a versioned manifest, not a fresh codebase. The same foundation powers a beauty SaaS, a restaurant, and a wine storefront, and every one of them stays **customizable, upgradeable, and supportable** as the platform improves.

## Why it's not AI slop

Generated apps don't fork the SDK. They sit on a strict **ownership boundary** (see [`docs/architecture-boundaries.md`](docs/architecture-boundaries.md)):

1. **Generated app** — pages, routes, theme, copy, app config, app-local plugins.
2. **Plugin config** — fields, statuses, rules, flags, modules (manifest data).
3. **Private extension** — partner/customer logic as an app-local plugin (same contract as official plugins).
4. **Fayz SDK / plugins** — engines, provider authority, security, tenancy, migrations, upgrades.

Because no layer forks another, an SDK upgrade across thousands of apps is one migration, not thousands of PRs — and customers customize from a label to a fully bespoke page **without ever ejecting** ([the customization ladder](docs/customization-ladder.md)).

## Packages

The public surface is multi-package — install only what you use ([supported surface](packages/sdk/src/supported-surface.json)):

| Package | Role |
|---|---|
| [`@fayz-ai/sdk`](packages/sdk) | API client, app params, runtime broker, shared contracts |
| [`@fayz-ai/core`](packages/core) | manifest, registries, entities, data providers, plugin runtime, events |
| [`@fayz-ai/saas`](packages/saas) | multi-tenancy, billing, permissions, CRUD engine |
| [`@fayz-ai/ui`](packages/ui) | UI primitives, layout shells, CRUD/dashboard components, theme |
| [`@fayz-ai/storefront`](packages/storefront) · [`@fayz-ai/shop`](packages/shop) | customer-facing commerce |
| `@fayz-ai/plugin-*` | à-la-carte vertical capabilities (crm, agenda, financial, menu, …) |

## Quickstart

```bash
npx @fayz-ai/cli create admin my-app   # or: storefront | member
cd my-app && npm install && npm run dev

fayz doctor          # validate manifest + architecture boundaries
fayz create plugin loyalty   # scaffold an app-local (incubator) plugin
```

## Docs

- [AGENTS.md](AGENTS.md) — **agents/new sessions start here**: deploy model, conventions, doc map
- [Direction](docs/DIRECTION.md) — thesis, roadmap, validation waves · [Decisions](docs/DECISIONS.md) — locked decision log
- [Architecture boundaries](docs/architecture-boundaries.md) — the ownership contract
- [Customization ladder](docs/customization-ladder.md) — config → fully bespoke, no forking
- [Architecture v2](docs/architecture-v2.md) — manifest-first design
- [Plugin patterns](PLUGIN_PATTERNS.md) · [Plugin model](docs/plugin-model.md) — how to build a plugin
- [Private plugins](docs/private-plugins.md) — the partner extension path
- [AI Builder taxonomy](docs/ai-builder-request-taxonomy.md) — request classes → boundary layers
- [Roadmap](docs/ROADMAP.md) · [Contributing](docs/contributing.md)

## License

MIT © Faya Labs
