---
"@fayz-ai/storefront": patch
---

Fix: the `classic` header variant (the default, and what `foodTemplate` ships) hid
site nav (home/catalog/category links) below the `md` breakpoint with no fallback —
mobile shoppers had no way to reach anything but the home hero buttons and footer
links. Below `md`, a hamburger button now opens a slide-in drawer with the nav
links and categories (closes on backdrop click, the X button, Escape, or navigating
to a link) — the `md+` inline layout is unchanged.
