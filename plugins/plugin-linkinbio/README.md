# @fayz-ai/plugin-linkinbio

Komi/linktree-style **link-in-bio** pages for any creator. A `BioPage` is an
identity + branding + an ordered list of content blocks, rendered as a public,
unauthenticated page (`/p/:slug`).

Status: **preview**. v1 ships the public page; the in-app editor is a v2 follow-up.

## Public usage (website host)

```ts
import { setGlobalSupabaseClient } from '@fayz-ai/core'
import { createPublicLinkInBioPlugin } from '@fayz-ai/plugin-linkinbio/public'

// Optional: point the provider at Supabase (`press_kits` table). Without a
// client, the plugin serves the seeded mock catalog.
setGlobalSupabaseClient(createClient(url, anonKey))

const bio = createPublicLinkInBioPlugin({
  basePath: '/p',
  seed: { perez: perezBioPage },              // mock/demo content by slug
  poweredBy: { label: 'Powered by The Channel', url: '/' },
  titleSuffix: 'Press Kit',
})

// bio.Provider wraps the app root; bio.manifest.routes has one guard:'public'
// route ({ path: '/p/:slug', component: BioPage }) to mount into your router.
```

## Block registry (extensibility seam)

The 11 built-in blocks (`hero`, `bio`, `gallery`, `video-grid`, `social-links`,
`embed`, `project`, `stats`, `venue-list`, `cta`, `text`) render via the built-in
switch. Register niche block types without forking:

```ts
import { registerBlock } from '@fayz-ai/plugin-linkinbio/public'
registerBlock('tour-map', ({ block }) => <TourMap stops={block.stops} />)
```

## Data

`BioPageDataProvider.getBySlug(slug)` — mock (seed map) or Supabase. The Supabase
provider reads a `press_kits`-shaped table: `slug`, `is_published`, and a jsonb
`data` column holding the full `BioPage` payload, with anon SELECT allowed when
`is_published` is true.

## Styling

Blocks are token-only: `getBrandingVars(branding)` maps the page branding to
`--pk-*` CSS variables set on the page container. Tailwind utility classes are
used for layout; no design-system CSS import is required.
