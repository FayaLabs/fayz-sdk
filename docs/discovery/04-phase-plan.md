# 04 — Phase Plan

This is the working execution order. It should stay lean and validation-oriented.

## Phase 0 — Discovery + reference audit

**Goal:** Capture Vini's inputs, inspect existing Fayz SDK/Fayz/Base44/fayz-app examples, and turn them into coherent architecture decisions.

**Outputs:**

- intake log;
- product brief;
- architecture principles;
- concept map;
- open questions;
- Base44/Odoo/reference comparison;
- implementation plan.

**Status:** In progress.

---

## Phase 1 — Manifest + provider contract lock

**Goal:** Define the durable contract for tenant-specific rendering and data access before wiring runtime behavior.

**Why first:** Panel rendering, project scaffolding, plugin modules, migrations, and retro-compat all depend on the same contract. If this is wrong, every downstream phase creates rework.

**Outputs:**

- App/SaaS manifest shape for Panel/admin pages;
- tenant-specific manifest reference model;
- provider adapter contract:
  - Supabase default;
  - Fayz API provider;
  - custom/multiple providers later;
- validation rules;
- example manifest extracted from `beauty-saas`.

**Core primitives:**

- AppManifest / SaaSManifest;
- Module;
- Entity;
- Field;
- Relationship;
- View/Page/Block;
- Action;
- Workflow;
- Permission;
- Event;
- AgentCapability;
- DataProvider / Resolver;
- Migration descriptor.

**Non-goals:**

- marketplace;
- full plugin installer;
- full workflow runtime;
- complete permission enforcement;
- remote registry;
- AI agent runtime;
- universal migration engine.

---

## Phase 2 — Fayz Panel integration

**Goal:** Implement `fayz-sdk` in Fayz so the editor Panel tab renders tenant-specific pages/plugins from a manifest stored/referenced in Fayz DB.

**Outputs:**

- DB model/table decision for SaaS/Panel manifest reference;
- API endpoint/resolver that returns manifest for a project/customer/tenant;
- Panel tab reads manifest and renders appropriate SDK surface;
- invariant/default items such as Cloud Features always appear;
- first working tenant manifest based on `beauty-saas`.

**Validation:** One project/customer renders a different Panel surface by changing manifest JSON, not app code.

---

## Phase 3 — Project scaffold + agent knowledge

**Goal:** Every new Fayz project includes the SDK foundation and the coding agent knows how to use it.

**Outputs:**

- update `fayz/apps/api/src/modules/projects/scaffold/index.ts` package generation;
- include SDK package/dependency/workspace shape;
- include SDK docs/context in generated project;
- agent guide for:
  - core settings;
  - installing modules/plugins;
  - adding custom code safely;
  - running SDK-generated migrations;
- example: agent adds ecommerce/shop module and creates a page.

**Validation:** A newly scaffolded Fayz project has SDK installed and a local agent instruction can use it correctly.

---

## Phase 4 — Retro-compat import and manifest-only mutation proof

**Goal:** Bring existing `../fayz-app` SDK-consuming projects into Fayz as projects and prove JSON/manifest edits can change products.

**Outputs:**

- import plan through FayaLabs GitHub import;
- compatibility matrix for existing apps;
- `beauty-saas` migrated/imported first;
- `tannat-store` migrated/imported after beauty proof;
- manifest-only edit changes a product surface;
- project-specific gaps documented.

**Validation:** At least `beauty-saas` works separately and inside Fayz Panel, with one booking created in agenda.

---

## Phase 5 — Plugin/module evolution

**Goal:** Evolve plugin system to support Fayz's AI-native ERP/community-builder thesis.

**Outputs:**

- plugin/module contract aligned with manifest contract;
- ecommerce/shop module inspired by `medusa-commerce`;
- calendar module inspired by `cal.diy`;
- database relationships and normalized concepts for modules;
- shop database model resolved;
- migrations generated/runnable through SDK/Fayz path.

**Validation:** Agent can install/add at least one module to a project using documented SDK workflow.

---

## Phase 6 — Foundation hardening + design system lock

**Goal:** Resolve foundational design-system variations and package contracts before locking SDK into all repos.

**Outputs:**

- token/theme/variation strategy;
- base components stabilized;
- compatibility shims where needed;
- smoke tests across products;
- build/typecheck/test gates.

**Validation:** Products work separately, Fayz works, generated projects work, and SDK package is safe enough to standardize.

---

## Phase 7 — Governance + ecosystem path

**Goal:** Prepare the scalable version of the platform: plugin/community ecosystem, auditability, approvals, and AI-agent-safe operations.

**Outputs:**

- audit log design;
- approval/risk model;
- plugin certification concept;
- marketplace/community publishing path;
- Linear/project operating model.

**Timing:** Design now, implement only the hooks needed for the current proof.
