---
'@fayz-ai/plugin-marketing': minor
'@fayz-ai/saas': patch
'@fayz-ai/ui': patch
---

Content planner wave (beauty-saas validation):

**plugin-marketing**
- Multi-platform accounts (`platforms text[]`, migration 002): one account/brand, many connections (Instagram, TikTok, YouTube, Facebook, LinkedIn, X, Pinterest, Threads); posts carry optional platform targets
- Board never blanks without an account: master account dropdown with empty state + create/settings modal (name, handle, platforms, inline two-step delete confirm — no modal-over-modal)
- Three views: Semanal (weeks anchored to real dates/months), Mensal (calendar with unscheduled tray, day-click create), Lista (audit table)
- Post cards: hover trash + drag between weeks; new posts prefill scheduled date from the selected week
- Plan brief opens as a right Sheet; new formats video/live/article with script templates; tenant-reactive reload (accounts no longer vanish after refresh)
- `deleteAccount` across provider/store; content tab icon (Clapperboard) now renders

- Recording-day ops: persisted shooting checklist per post ("generate from script" seeds one item per TAKE), expanded by default only on the post's release day; static posts get a Caption label + media upload (public `mkt-media` bucket, migration 003) and a social post preview (Instagram/Facebook/LinkedIn/X frames, one tab per platform)
- Monthly view: days holding more posts than fit show a "+N" expander

**saas**
- `useModuleNavigation`: hash parser reconstructs `view:id` for `/x/post/<id>` routes and any trailing-UUID path — deep links no longer fall back to the module home

**ui**
- New `ContentSplit`/`ContentSplitTrigger` layout: main content + right companion panel, mobile-first (Sheet below `lg`, sticky docked column above, collapsible into a reopen rail); `MarkdownEditor` gains a `renderPreview` seam
- `ICON_MAP` gains Clapperboard; Select/Dropdown menu items use the theme radius token (`rounded-button`) instead of near-square `rounded-sm`
