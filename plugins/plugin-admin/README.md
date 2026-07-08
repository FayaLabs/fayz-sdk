# @fayz-ai/plugin-admin

> A Panel view onto your app's own shell config — layout, module nav, and branding, at a glance.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-admin.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-admin)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-admin.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Every SaaS/admin-template app already resolves a shell config — sidebar or topbar layout, rail or tabs for module navigation, a mobile header treatment, whether org/branding settings are shown — from `FayzAppConfig` (`src/config/app.tsx` / `theme.ts`) at build time. Today an operator can't see any of that from the Panel; changing it means hand-editing config files and redeploying. `plugin-admin` adds an `/admin` page that reflects the resolved config so it's visible without reading source.

## Foundation status — read this first

This is a **foundation pass, not a capability-complete plugin**. It ships a read-only view of `layout` / `moduleNav` / `mobileHeader` / `branding`; there is **no write path** yet. The data provider (mock + Supabase stub) both simply echo back the statically resolved config — there is no shell-config table, and this plugin does not make `FayzAppConfig.layout` (or any of its siblings) mutable at runtime.

**Follow-up**: wire real read/write of these fields back into `FayzAppConfig` once a plugin-editable extension point exists for shell-level config. `docs/CUSTOMIZATION.md` already names the gap — the saas shell's slot contracts (named layout/menu slots, published like the storefront's) are `[planned FAY-1248/FAY-1196]`, the "persona/slots phase". `plugin-admin`'s write path is a consumer of that phase, not a substitute for it: it should land once shell slots have a published contract to write through, not by having this plugin reach around `defineSaas` and mutate config ad hoc.

## What's inside
- An `/admin` page: read-only cards for layout, module navigation style, mobile header treatment, and branding visibility
- Config mirrors `FayzAppConfig` 1:1 (`layout`, `moduleNav`, `mobileHeader`, `navTransition`, `orgSettings`, `branding`) — no new config shape
- An AI tool, `getShellSettings`, so "what layout is this app using?" already works
- Mock + Supabase data providers (both stubs today, chosen automatically) and full i18n

## Install
```bash
npm install @fayz-ai/plugin-admin
```
Peer deps: `react`, `react-dom`. Runtime deps include `@fayz-ai/core`, `@fayz-ai/ui`, and `@fayz-ai/saas`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createAdminPlugin } from '@fayz-ai/plugin-admin'

export const app = defineSaas({
  // ...
  layout: 'sidebar',
  moduleNav: 'tabs',
  plugins: [
    createAdminPlugin({
      layout: 'sidebar',
      moduleNav: 'tabs',
      mobileHeader: 'minimal',
      branding: true,
    }),
  ],
})
```
Pass the same values you already give `defineSaas` — the plugin doesn't derive them from the app config automatically (no such wiring exists yet); it just renders what you tell it.

## Part of the Fayz SDK
Targets the saas/admin-template scaffold only (`scaffolds: ['saas']`) — this is Panel-side shell config, not a storefront concern. Pairs with whatever settings surface the app already exposes; it adds visibility, not a new settings system.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md) and `docs/CUSTOMIZATION.md` (persona/slots phase) for the write-path this is scaffolding toward.
