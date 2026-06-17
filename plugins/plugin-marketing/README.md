# @fayz-ai/plugin-marketing

> One acquisition & conversion engine — every channel, every vertical.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-marketing.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-marketing)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-marketing.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Marketing analytics are always the same shape — channels, campaigns, a funnel, landing-page CVR — but what counts as a "conversion" changes per business. A salon converts a booking, a store converts an order, an agency converts a lead. `plugin-marketing` is one plugin that adapts to all of them: pick a `domain` preset (or pass an explicit conversion model + channels) and the funnel, channel performance, and cost-per-acquisition are computed generically on top of it.

It ships a vertical-flavored mock today so the surface is real from the first install. Real attribution arrives through clean DI seams — an `AttributionBridge` to read conversions from CRM/agenda/orders, and a `SitesPerformanceBridge` to read landing-page numbers from your sites — so you wire reality in without rewriting the plugin. Campaigns and channels are first-class, and the whole thing exposes AI tools so your assistant can answer "which channel converts best?" out loud.

## What's inside
- A `/marketing` workspace: overview, channels (list + detail), campaigns (list + composer), funnel, and landing pages
- `domain` presets that set the conversion model + acquisition channels per vertical (defaults to `agency`)
- Generic channel performance (reach, conversions, CVR, spend, CPA), funnel, and campaign CVR
- DI seams: `attributionBridge` and `sitesBridge` to feed real data when it's ready
- Domain events: `marketing.conversion.tracked`, `campaign.created`, `campaign.updated`, `channel.synced`
- AI tools: `channelPerformance`, `topChannels`, `campaignCvr`, and `createCampaign`
- Dashboard widgets, a central Settings tab, currency formatting, and full i18n
- Exported `MARKETING_PRESETS` and a mock provider for local development

## Install
```bash
npm install @fayz-ai/plugin-marketing
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas`, plus `react` / `react-dom`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createMarketingPlugin } from '@fayz-ai/plugin-marketing'

export const app = defineSaas({
  // ...
  plugins: [
    createMarketingPlugin({
      domain: 'beauty',            // conversion model + channels from the preset
      currency: { code: 'BRL' },
      // attributionBridge / sitesBridge wire real data in later
    }),
  ],
})
```

## Part of the Fayz SDK
The acquisition half of growth. Pairs with `plugin-crm` (the leads and deals it converts into), `plugin-conversations` (broadcast replies land in the inbox), and `plugin-reputation` (social proof that lifts CVR).

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-marketing) for current gaps, missing features, and good first issues.
