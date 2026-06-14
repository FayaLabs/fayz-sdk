# 02 — Architecture Principles

## 1. Manifest-first

The app/module definition should be data first. The AI should generate structured manifests and module definitions that can be validated, diffed, stored, migrated, inspected, and eventually installed.

Existing direction in `docs/architecture-v2.md` remains the baseline:

- manifest = app definition;
- registries = code escape hatches;
- scaffolds = renderers/surfaces;
- plugins/modules = installable business capabilities.

## 2. SDK as contract before runtime

The first SDK phase should define the language of Fayz modules, not the whole platform.

Build now:

- TypeScript types;
- helper builders;
- validation;
- examples;
- tests;
- documentation.

Do not build yet:

- marketplace;
- installer;
- workflow execution engine;
- remote registry;
- runtime sandbox;
- full permission enforcement;
- AI agent executor;
- complex migration engine.

## 3. Odoo-inspired, not Odoo-cloned

Odoo is a useful reference because it combines:

- modules;
- business models;
- views;
- actions;
- permissions;
- community addons;
- vertical apps.

Fayz should copy the **conceptual shape**, not the complexity. Our version should be simpler, manifest-first, AI-readable, and safer for generated/customized apps.

## 4. Business truth before UI

The foundation must privilege business objects and processes over screens.

Core primitives should start from:

- entities;
- fields;
- relationships;
- workflows;
- actions;
- permissions;
- events.

Views and blocks matter, but they should reflect business structure, not replace it.

## 5. Safe customization ladder

Customization should stay additive:

1. config;
2. theme;
3. page/block recomposition;
4. slots/widgets;
5. component overrides;
6. custom pages/components;
7. custom plugins/modules.

No eject path. If a user needs to fork SDK internals, it is an SDK gap.

## 6. Explicit actions for agents

AI agents should not mutate business state arbitrarily. They should operate through explicit actions with declared inputs, outputs, permissions, risk levels, and auditability.

This is a core distinction between toy AI apps and enterprise-grade AI ERP.

## 7. Governance hooks from day one, enforcement later

We do not need full enterprise governance in v1, but primitives must leave room for:

- role-based permissions;
- human approval;
- audit logs;
- rollback/versioning;
- action risk levels;
- plugin trust/certification;
- policy engine;
- agent scopes.

## 8. Vertical proof before horizontal abstraction

Do not design from imaginary enterprise complexity. Use Beautysoft and restaurant/POS as validation cases.

If a primitive is not needed by either vertical or the manifest-first runtime, question whether it belongs in v1.

## 9. JSON-serializable where possible

Definitions should be serializable. Use IDs and registry references instead of inline functions/components.

This preserves future support for:

- storage in DB;
- AI editing;
- diff/review;
- migration;
- marketplace;
- safe preview.

## 10. Build for later upgrade, not final scale

We want base concepts that are durable enough to validate the thesis and upgrade later. Avoid both extremes:

- under-structured generated spaghetti;
- over-abstracted SAP-scale architecture before validation.
