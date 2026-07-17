---
"@fayz-ai/storefront": patch
---

Fix: the `classic` header variant (the default, and what `foodTemplate` ships) hid site nav (home/catalog/category links) below the `md` breakpoint with no fallback — mobile shoppers had no way to reach anything but the home hero buttons and footer links. Below `md`, `NavLinks` now renders in its own full-width horizontally-scrollable row (same pattern already used by the `centered`/`search` variants), while the `md+` inline layout is unchanged.
