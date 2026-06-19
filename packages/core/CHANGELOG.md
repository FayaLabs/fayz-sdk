# @fayz-ai/core

## 0.1.8

### Patch Changes

- Financial ERP extract: bill vs payment split (each payment is its own ledger row),
  real bank-style extract with opening/closing balance + transfers + card net settlement,
  account-linked payments, and a per-person statement tab (DetailTab.requiresWidgetZone +
  person.detail.financial widget zone). Includes supporting core/saas detail-tab wiring.

## 0.1.7

### Patch Changes

- Ship package READMEs to npm. Republish the SaaS foundation packages so their
  npm pages render the new story-driven READMEs (npm only shows a README for a
  freshly published version). No code changes — docs only.

## 0.1.6

### Patch Changes

- 413842d: Publish the SaaS app foundation to public npm: core, auth, ui, saas, db, and the
  agenda, financial, inventory, crm, dashboard, marketing, forms, and tasks plugins.
  This unblocks client repos (and the Fayz generator) installing the full plugin set
  as normal npm dependencies instead of via local source links.
