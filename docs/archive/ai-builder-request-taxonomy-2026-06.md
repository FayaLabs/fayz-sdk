> **ARCHIVED 2026-07-06** — superseded by [AI-BUILDER.md](../AI-BUILDER.md). Historical reference only; do not follow operationally.

# AI Builder request taxonomy

> The contract the AI Builder's request classifier targets. The **classifier itself lives in the `fayz` platform repo**; this repo owns the canonical taxonomy so platform and SDK never drift. Source of truth: [`@fayz-ai/sdk/ai-builder`](../packages/sdk/src/ai-builder.ts). Layer definitions: `architecture-boundaries.md`.

Every user request to the AI Builder is classified into exactly one class, which determines **which ownership layer it may touch** and whether it needs code/deploy. The product rule: the AI never says "impossible" — it classifies, then either acts, routes to a partner, or refuses (only `unsafe-blocked`).

| Class | Layer | Editable by | Code? | Deploy? | What it is |
|---|---|---|---|---|---|
| **app-edit** | app | AI | no¹ | no¹ | pages, routes, theme, copy, blocks, slots (ladder 1–6) |
| **plugin-config** | plugin-config | AI | no | no | enabled modules, fields, statuses, rules, flags, labels |
| **private-extension** | private-extension | partner | yes | yes | new behaviour as an app-local plugin (`fayz create plugin`) |
| **platform-or-plugin-upgrade** | platform | Fayz | yes | yes | bump SDK/plugins, run migrations, evolve engines |
| **unsafe-blocked** | none | none | — | — | mutate SDK/plugin internals, fork SDK pages, import a provider SDK in app code, bypass tenancy/security |

¹ ladder levels 1–4 are pure manifest edits (no code/deploy); levels 5–6 are app-owned code.

## The `unsafe-blocked` set

These are refused or rerouted, never executed:
- editing code inside an `@fayz-ai/*` package,
- copying/forking an SDK page or plugin internal into the app,
- importing a provider SDK (`@supabase/supabase-js`, `stripe`, …) directly into app/browser code — use the Fayz boundary (`getSupabaseClientOptional` / a connector),
- disabling or bypassing RLS, tenancy, or permissions.

A blocked request is usually reroutable: "edit the CRM plugin" → offer a **private-extension** that adds the behaviour without touching the plugin; "call Supabase directly" → offer the data-provider/connector path.

## Using the contract

```ts
import { AI_BUILDER_REQUEST_CLASSES, isAllowedRequestClass } from '@fayz-ai/sdk/ai-builder'

const def = AI_BUILDER_REQUEST_CLASSES[predictedClass]
if (!isAllowedRequestClass(def.id)) rerouteOrRefuse(def)
else routeTo(def.layer)
```

The classifier (in `fayz`) maps natural-language requests → these class ids; this taxonomy guarantees each class has a defined, boundary-safe destination.
