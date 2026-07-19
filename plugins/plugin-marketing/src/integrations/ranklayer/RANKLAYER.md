# RankLayer connector

Surfaces in **Marketing → settings → Integrações** (rendered by the shared
`ConnectorsHub`). Follows the connector contract in
`packages/core/src/integrations/index.ts` and mirrors the PlugBank precedent
(`beauty-saas/src/plugins/openbanking`).

## Status: SCAFFOLD

This ships the control plane only:

- `connectorDef.tsx` — the `ConnectorDefinition` (api-key form: API Key + site
  domain, status badge, `ExtraPanel` with a "sync coming soon" note).
- `data/supabase.ts` — persists the connection row and reads the sync log.
- `../../migrations/004_ranklayer.sql` — `plg_marketing_ranklayer_integrations`
  + `plg_marketing_ranklayer_sync_log` (tenant RLS).

`testConnection` currently accepts any non-empty API key and **no real sync
runs** — RankLayer has no public API wired yet.

## What the RankLayer PR needs to fill in

1. **Edge function** `functions/ranklayer-sync/index.ts` holding the RankLayer
   API key server-side (move it out of the `api_key` column into a secret if the
   provider requires it), with actions:
   - `test_connection` — validate the key against RankLayer.
   - `sync` — the agreed direction. RankLayer generates/publishes SEO pages and
     articles, so the likely first flow is **inbound**: pull RankLayer-published
     articles and upsert them as `plg_blog_posts` (status `published`) so they
     appear on the site's `/blog`. Confirm direction with the RankLayer team.
2. **Real `testConnection` / `sync`** in `data/supabase.ts` — replace the stubs
   to invoke the edge function; write a `plg_marketing_ranklayer_sync_log` row
   per run (the `SyncRun` audit shape).
3. **ExtraPanel** — swap the "coming soon" note for a "Sync now" button + the
   real history table (the history rendering is already wired).

The connector is already registered on the marketing manifest
(`connectors: [ranklayerConnectorDef]`) and the Integrações tab is enabled
(`hostPluginId: 'marketing'` on the settings panel), so no wiring changes are
needed — only the data-plane implementation above.
