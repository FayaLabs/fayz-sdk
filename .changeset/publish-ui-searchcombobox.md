---
"@fayz-ai/ui": patch
---

Export `SearchCombobox` from `@fayz-ai/ui`.

The component landed in source on 2026-07-22 (`17556ea`) alongside the shared
`ContactPicker` in `@fayz-ai/saas`, but `@fayz-ai/ui` was never republished —
`0.8.1` remained the latest on npm. `@fayz-ai/saas@0.8.2` shipped importing it,
so every app resolving that pair failed to build:

    "SearchCombobox" is not exported by "node_modules/@fayz-ai/ui/dist/index.js",
      imported by "node_modules/@fayz-ai/saas/dist/index.js"

This is a backport onto the 0.8.x line so apps pinned to `^0.8.1` pick the fix up
without a dependency bump. Additive only — no other `ui` change from `main` is
included.
