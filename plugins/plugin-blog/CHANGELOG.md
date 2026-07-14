# @fayz-ai/plugin-blog

## 0.1.0

### Initial release

- Headless blog website surface: `createBlogPlugin(options)` returns `{ manifest, Provider, dataProvider }` (the "website plugin" / Model A bundle).
- Public routes: `/blog` (`BlogList`) and `/blog/:slug` (`PostDetail`), mounted under a configurable `basePath`.
- Data seam: `createSafeDataProvider` resolves a Supabase provider when configured, else a mock provider seeded from `options.seed`.
- SEO: per-page `useSeo` (incl. `og:site_name`) plus organization and breadcrumb JSON-LD; configurable Medium-style byline (`defaultAuthor`) and pt-BR labels.
- Exposes `BlogList` / `PostDetail` / `PostCard` / `AuthorAvatar` components and `useBlogPosts` / `usePost` hooks for custom composition.
