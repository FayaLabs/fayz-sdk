# @fayz-ai/plugin-automations

> **Status: experimental (incubating).** Not capability-complete — missing some or all of the capability bar (data-provider contract w/ supabase+mock pair, entity registries, settings, migrations; see `docs/PLUGIN-PATTERNS.md`). Fine to explore in dogfoods; NOT ready for fresh installs or generated apps, and its API may change without notice.

> Visual trigger → action workflows, native to your app's own events.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-automations.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-automations)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-automations.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

The best automations don't live in a third-party tool watching webhooks from the outside — they live inside the app, listening to its own events. plugin-automations is the GoHighLevel "Automation" surface for Fayz: when a form is submitted, a call is missed, or a deal is won, fan out into SMS, email, waits, tags, and tasks. Because it's a plugin in the same `defineSaas` app, it can react to real domain events instead of guessing from polling.

We're honest about where it is. M1 ships a polished `/automations` home — real workflow cards with triggers, multi-step sequences, and enrollment stats — to lock the model and UX. The trigger→action execution engine (over the core event bus + scheduler) is the next milestone.

## What's inside
- **`/automations` route + nav entry** (icon `Zap`), permission-gated on `automations:read`
- **Automations home view** — workflows with triggers, step sequences (SMS, email, wait, tag, task), and enrollment counts
- **Universal scope** — works across every vertical
- **Configurable nav** — `navPosition`, `navSection`, `navLabel`
- **Declared feature** — `automations` (in the "Automate" group) for permissions and feature gating

> Status: M1 mock home. The execution engine over the event bus + scheduler is on the roadmap.

## Install
```bash
npm install @fayz-ai/plugin-automations
```
Peer deps: `react`, `react-dom`. Runtime deps: `@fayz-ai/core`, `@fayz-ai/ui`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createAutomationsPlugin } from '@fayz-ai/plugin-automations'

export const app = defineSaas({
  // ...
  plugins: [
    createAutomationsPlugin({
      navLabel: 'Automations',
      navPosition: 6,
    }),
  ],
})
```

## Part of the Fayz SDK
One of the composable plugins for `@fayz-ai/saas` — this one owns the automate surface: workflows that react to your app's events.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-automations) for current gaps, missing features, and good first issues.
