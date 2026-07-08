---
"@fayz-ai/plugin-courses": minor
---

Commerce modules are now opt-in (FAY-1247 rule): the mini-Kiwify nav entries (Members area, Sales, Subscriptions, Financial, Reports), their routes, and the home-surface commerce KPIs (revenue/sales/MRR/fees) only render when the host enables them via `modules: { membersArea, sales, subscriptions, financial, reports }`. Hosts embedding courses as a lightweight feature (e.g. agency-os "Memberships") get only the base nav entry + editor; course-admin enables everything explicitly. Fixes the nav/widget leak into agency-os.
