// Front-door re-export of @fayz-ai/ui.
//
// Apps built on @fayz-ai/saas import design-system primitives from
// `@fayz-ai/saas/ui` instead of depending on @fayz-ai/ui directly. Kept on its
// own subpath (not folded into the main entry) so importing a saas hook does
// not drag the entire UI graph (recharts/radix/cmdk) into the dep-optimizer.
export * from '@fayz-ai/ui'
