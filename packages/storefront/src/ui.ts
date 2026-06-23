// Front-door re-export of @fayz-ai/ui for storefront apps.
// Import design-system primitives from `@fayz-ai/storefront/ui` instead of
// depending on @fayz-ai/ui directly. Own module graph keeps the UI deps out of
// the main storefront entry.
export * from '@fayz-ai/ui'
