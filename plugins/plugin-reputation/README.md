# @fayz-ai/plugin-reputation

> **Status: experimental (incubating).** Not capability-complete — missing some or all of the capability bar (data-provider contract w/ supabase+mock pair, entity registries, settings, migrations; see `docs/PLUGIN-PATTERNS.md`). Fine to explore in dogfoods; NOT ready for fresh installs or generated apps, and its API may change without notice.

> Reviews and reputation, in one place — see the stars, reply, ask for more.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-reputation.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-reputation)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-reputation.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Reputation is the cheapest growth lever a local business has, and the easiest to ignore. Reviews sit scattered across Google and Facebook, replies never happen, and nobody ever asks the happy customer for a rating. `plugin-reputation` is the GoHighLevel-style reputation surface for the Fayz engine: a single home for your rating, your review feed, and the actions that move it.

This plugin is an early scaffold. It ships a polished reputation home today — an average-rating card, a star distribution, a review feed with reply actions, and a "request reviews" entry point — running on built-in mock data so the surface is real to design and demo against. Live Google/Facebook review sync and automated review requests (over the SDK's connectors + automations) are the next milestone; the page is the placeholder they'll fill.

## What's inside
- A `/reputation` home: average-rating card, star-distribution bars, and a review feed
- Per-review reply actions and a "Request reviews" call-to-action
- Google / Facebook review sources represented in the UI (mock data today)
- Configurable navigation (label, position, section) and vertical scoping

## Install
```bash
npm install @fayz-ai/plugin-reputation
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, plus `react` / `react-dom`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createReputationPlugin } from '@fayz-ai/plugin-reputation'

export const app = defineSaas({
  // ...
  plugins: [
    createReputationPlugin({ navLabel: 'Reputation', navPosition: 8 }),
  ],
})
```

## Part of the Fayz SDK
The trust layer of the engine. Pairs with `plugin-conversations` (turn a great chat into a review request), `plugin-crm` (know exactly who to ask), and `plugin-marketing` (feed the social proof back into acquisition).

## Roadmap & contributing
Early scaffold — built in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-reputation) for current gaps, missing features, and good first issues.
