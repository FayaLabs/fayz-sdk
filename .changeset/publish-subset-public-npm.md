---
"@fayz-ai/core": patch
"@fayz-ai/auth": patch
"@fayz-ai/ui": patch
"@fayz-ai/saas": patch
"@fayz-ai/db": patch
"@fayz-ai/plugin-agenda": patch
"@fayz-ai/plugin-financial": patch
"@fayz-ai/plugin-inventory": patch
"@fayz-ai/plugin-crm": patch
"@fayz-ai/plugin-dashboard": patch
"@fayz-ai/plugin-marketing": patch
"@fayz-ai/plugin-forms": patch
"@fayz-ai/plugin-tasks": patch
"@fayz-ai/plugin-reports": patch
---

Publish the SaaS app foundation to public npm: core, auth, ui, saas, db, and the
agenda, financial, inventory, crm, dashboard, marketing, forms, and tasks plugins.
This unblocks client repos (and the Fayz generator) installing the full plugin set
as normal npm dependencies instead of via local source links.
