# The Customization Ladder ("nada engessado")

> How a generated Fayz app goes from pure-config to fully bespoke **without ever forking SDK code**. Each level is strictly additive: a client at level 6 still receives SDK upgrades for everything they didn't touch. Companion: `architecture-v2.md` (§4 defines the ladder; this doc is the concrete how-to). All mechanisms below are implemented in `@fayz-ai/core` and verified.

The product rule: **defaults everywhere, dead-ends nowhere, and no eject path.** If a client needs to eject, that's an SDK gap to fix — file it.

| Level | What changes | Where | Code? | Deploy? |
|---|---|---|---|---|
| 1 Config | labels, currency, flags, plugin config | `app.manifest.json` | no | no |
| 2 Theme | template + token overrides | `app.manifest.json` `theme` | no | no |
| 3 Recompose | reorder/add/remove blocks, new pages | `app.manifest.json` `surfaces.*.pages[].blocks` | no | no |
| 4 Slots | inject widgets into named zones | manifest widget refs | sometimes | sometimes |
| 5 Override | replace any SDK component/block by id | `src/registry.tsx` | yes | yes |
| 6 Custom pages/blocks | bespoke React, manifest-routed | `src/registry.tsx` + components | yes | yes |
| 7 Custom plugin | own entities/migrations/nav/blocks | a plugin package | yes | yes |

Levels 1–4 are **platform-editable** — fayz.ai's UI / AI agent edits the manifest live, no code, no deploy. Levels 5–7 are repo code, but **scoped to `src/registry.tsx` + your own components** — never forks of SDK pages.

---

## Level 1–2 — Config & Theme (data only)

```jsonc
// app.manifest.json
{
  "theme": { "extends": "sertao", "colors": { "brand": "hsl(350 45% 30%)" } },
  "locale": { "default": "pt-BR", "currency": "BRL" },
  "surfaces": { "storefront": { "scaffold": "storefront",
    "options": { "announcement": "FRETE GRÁTIS ACIMA DE R$300" } } }
}
```

## Level 3 — Recompose (block trees)

A page is a block tree resolved through the block registry — pure data. Reorder, add, or remove blocks; create entirely new pages; all without code:

```jsonc
"pages": [
  { "path": "/", "blocks": [
    { "type": "hero",    "props": { "variant": "banner", "slides": [/*…*/] } },
    { "type": "products","props": { "title": "Destaques", "filter": "new", "limit": 4 } }
  ]},
  { "path": "/harmonizacao", "blocks": [ { "type": "manifesto", "props": { "text": "…" } } ] }
]
```

Built-in block types come from the SDK and installed plugins; `listBlocks()` enumerates what's available (and the platform renders a picker from each block's `propsSchema`).

## Level 4 — Slots

Widgets render into named zones (`WidgetZone.TOPBAR_END`, `SIDEBAR_FOOTER`, `PAGE_AFTER`, `FLOATING`, …). Reference a registered widget from the manifest; for a bespoke widget, register it (level 5/6) and reference it by id.

## Level 5 — Override an SDK component/block

Every SDK component that renders a domain concept has a **registry id**. Re-register that id in `src/registry.tsx` and your version wins (last-registration-wins); it receives the **same typed props** as the original, so SDK upgrades evolve internals freely behind the props contract:

```tsx
// src/registry.tsx
import { registerComponent, registerBlock } from '@fayz-ai/core'
import { BrandedDetailHeader } from './components/BrandedDetailHeader'
import { FancyHero } from './components/FancyHero'

registerComponent('crud.detail-header', BrandedDetailHeader) // override an SDK component
registerBlock('hero', FancyHero)                              // override the built-in hero block
```

## Level 6 — Custom pages & blocks (`custom:` namespace)

Bespoke React, namespaced `custom:` (the platform never generates `custom:` ids — they only come from your repo). Register, then reference by id from the manifest. Your component runs with full SDK context (data provider, tenant, permissions, i18n) via hooks:

```tsx
// src/registry.tsx
import { registerBlock, registerPage } from '@fayz-ai/core'
import { WineStory } from './blocks/WineStory'
import { HarvestBoard } from './pages/HarvestBoard'

registerBlock('custom:wine-story', WineStory)
registerPage('custom:harvest-board', HarvestBoard)
```

```jsonc
// app.manifest.json — reference them as data
"pages": [
  { "path": "/safra", "component": "custom:harvest-board" },
  { "path": "/", "blocks": [ { "type": "custom:wine-story", "props": { "year": 2019 } } ] }
]
```

## Level 7 — Custom plugin

When customization is a reusable capability (its own entities, migrations, nav, blocks, AI tools), build a plugin — the **same `PluginManifest` contract** as official plugins, app-local or published privately. Register its factory in `src/plugins.generated.ts` and add a `PluginRef` to the manifest. This is the ceiling, and it's the same ceiling the SDK's own plugins sit at — there is nothing an SDK plugin can do that a client plugin can't.

---

## Why upgrades stay safe

- Overrides are keyed by id and receive the original's typed props → SDK internals change without breaking you.
- Custom code is confined to `src/registry.tsx` + your components + your plugins; you never copy an SDK page, so `fayz upgrade` (bump `@fayz-ai/core` + run manifest migrations) touches everything you *didn't* customize and leaves your overrides intact.
- The registry is introspectable (`listBlocks`, `listComponents`, `listMetrics`, `listPluginFactories`), so the platform always knows exactly what a given app overrides — which is also how `fayz doctor` reports drift.

> Working at levels 5–7 (repo code) locally? See [LOCAL-DEV.md](./LOCAL-DEV.md) for how `@fayz-ai/*` resolves to local SDK source vs. published packages (`FAYZ_SDK_SOURCE`, the `*:published-sdk` scripts).
