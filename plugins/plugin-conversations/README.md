# @fayz-ai/plugin-conversations

> **Status: experimental (incubating).** Not capability-complete — missing some or all of the capability bar (data-provider contract w/ supabase+mock pair, entity registries, settings, migrations; see `docs/PLUGIN-PATTERNS.md`). Fine to explore in dogfoods; NOT ready for fresh installs or generated apps, and its API may change without notice.

> One omni-channel inbox — SMS, WhatsApp, Instagram, email, and web chat in one thread.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-conversations.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-conversations)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-conversations.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Customers reach out everywhere — a WhatsApp here, an Instagram DM there, an email, a text. Replying across five tabs is how businesses drop conversations. `plugin-conversations` is the GoHighLevel-style unified inbox for the Fayz engine: every channel collapses into one threaded view, so a salon, a restaurant, or an agency answers everyone from a single place.

This is foundational today. The plugin ships a complete inbox UI and a data-provider seam: it runs on a rich mock out of the box, and reads/writes the `conversations` + `conversation_messages` tables (tenant-scoped) when a Supabase client is registered. Real channel connectors — Twilio, WhatsApp Cloud, Meta, IMAP — are the next milestone, but the inbox, the store, the events, and the AI tools are already wired so the rest snaps in behind them.

## What's inside
- A full-bleed `/conversations` inbox view backed by a Zustand store
- A `ConversationsProvider` seam: mock provider, or a Supabase provider (tenant-scoped via the active org) when a client is registered
- Domain events: `conversations.message.received`, `conversations.message.sent`
- AI tools: `listConversations` (filter by `sms` / `whatsapp` / `instagram` / `email` / `webchat`) and `sendMessage`
- Configurable navigation and full i18n
- Exported types (`Conversation`, `Message`, `Channel`) and the Supabase provider factory for custom wiring

## Install
```bash
npm install @fayz-ai/plugin-conversations
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas`, plus `react` / `react-dom`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createConversationsPlugin } from '@fayz-ai/plugin-conversations'

export const app = defineSaas({
  // ...
  plugins: [
    createConversationsPlugin({ navLabel: 'Inbox', navPosition: 1 }),
  ],
})
```
With no Supabase client registered it runs on the mock inbox; register one and it persists to `conversations` / `conversation_messages` automatically.

## Part of the Fayz SDK
The conversation layer of the engine. Pairs with `plugin-crm` (who you're talking to), `plugin-marketing` (broadcasts that start the thread), and `plugin-reputation` (turning a happy reply into a review).

## Roadmap & contributing
Early and foundational — built in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-conversations) for current gaps, missing features, and good first issues.
