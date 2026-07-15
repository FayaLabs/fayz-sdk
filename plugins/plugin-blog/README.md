# @fayz-ai/plugin-blog

> A headless blog surface — post list + article page — you drop into any Fayz website.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-blog.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-blog)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-blog.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — pre-1.0. Ships a public website surface (blog list + post detail) running on bundled mock/seed data, with a Supabase-backed provider seam included and evolving. No admin UI in M1 (the host owns website navigation). APIs may change before 1.0.

Marketing sites need a blog, and every one ends up rebuilt from scratch. `plugin-blog` is the reusable version: a headless, SEO-ready blog you compose into a Fayz website as a bundle of `{ manifest, Provider }`. It ships the public read surface — a `/blog` list and a `/blog/:slug` article page — plus the data seam behind them, so the host site owns layout and navigation while the plugin owns posts.

It follows the "website plugin" (Model A) pattern: instead of a `defineSaas` plugin, `createBlogPlugin` returns a manifest (with public routes), an app-root `Provider`, and the resolved data provider. Drop the routes into your router, wrap your app in the `Provider`, and you have a blog.

## What's inside
- **Public routes** — `GET /blog` (list) and `/blog/:slug` (detail), both `guard: "public"`, mounted under a configurable `basePath`
- **Components** — `BlogList`, `PostDetail`, `PostCard`, `AuthorAvatar` (exported for custom composition)
- **Hooks** — `useBlogPosts`, `usePost`, and `useBlogContext`
- **Data seam** — `createSafeDataProvider` picks `createSupabaseBlogProvider` when configured, else `createMockBlogProvider` seeded from your `seed` posts
- **SEO** — per-page `useSeo` with `og:site_name`, plus organization + breadcrumb JSON-LD
- **Byline + i18n defaults** — configurable `defaultAuthor`, `siteName`, and pt-BR list/back labels

## Install
```bash
npm install @fayz-ai/plugin-blog
```
Peer deps: `react`, `react-dom`, `react-router-dom`. Runtime dep: `@fayz-ai/core`.

## Usage
```tsx
import { createBlogPlugin } from '@fayz-ai/plugin-blog'

const blog = createBlogPlugin({
  basePath: '/blog',
  siteName: 'Acme',
  defaultAuthor: { name: 'Equipe Acme' },
  seed: { posts: [/* ... */] },
})

// blog.manifest.routes -> spread into your website router
// wrap your app tree in <blog.Provider> so the routes resolve their data
```

## Part of the Fayz SDK
A website surface plugin. Pairs with `@fayz-ai/plugin-sites` and the storefront/website scaffolds; complements `@fayz-ai/plugin-payments` in composing bespoke marketing sites from curated plugins.
