# Fayz SDK

> Open-source foundation for building professional, end-to-end SaaS, ecommerce, and storefront products — not throwaway prototypes.

[![license](https://img.shields.io/npm/l/@fayz-ai/core.svg)](LICENSE)

Fayz turns "one abstraction set → N vertical products" into reality. A new product is a **composition** — config + plugins + theme — rendered from a versioned manifest, not a fresh codebase. The same foundation powers a beauty SaaS, a restaurant, and a wine storefront, and every one of them stays **customizable, upgradeable, and supportable** as the platform improves.

## Why it's not AI slop

Generated apps don't fork the SDK. They sit on a strict **ownership boundary** (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)):

1. **Generated app** — pages, routes, theme, copy, app config, app-local plugins.
2. **Plugin config** — fields, statuses, rules, flags, modules (manifest data).
3. **Private extension** — partner/customer logic as an app-local plugin (same contract as official plugins).
4. **Fayz SDK / plugins** — engines, provider authority, security, tenancy, migrations, upgrades.

Because no layer forks another, an SDK upgrade across thousands of apps is one migration, not thousands of PRs — and customers customize from a label to a fully bespoke page **without ever ejecting** ([the customization ladder](docs/CUSTOMIZATION.md)).

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

- [docs/README.md](docs/README.md) — **the doc map and reading order** (canonical set, rewritten 2026-07)
- [AGENTS.md](AGENTS.md) — agents/new sessions start here: deploy model, conventions
- [Architecture](docs/ARCHITECTURE.md) — the north star: topology, ownership layers, invariants
- [Plugins](docs/PLUGINS.md) · [Plugin patterns](docs/PLUGIN-PATTERNS.md) — the contract and the enforced anatomy
- [Customization](docs/CUSTOMIZATION.md) — config → fully bespoke, no forking
- [Data model](docs/DATA-MODEL.md) · [Connectors](docs/CONNECTORS.md) · [Security](docs/SECURITY.md) · [Themes](docs/THEMES.md)
- [AI Builder contract](docs/AI-BUILDER.md) — how the fayz builder operates SDK apps (v0.1)
- [Roadmap](docs/ROADMAP.md) — milestones, feasibility, gap register
- [Direction](docs/DIRECTION.md) — thesis, validation waves · [Decisions](docs/DECISIONS.md) — locked decision log

## License

MIT © Faya Labs
