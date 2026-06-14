# 03 — Concept Map

This is the working glossary for the Fayz SDK foundation. Terms may evolve as Vini adds more input.

## App Manifest

The full definition of a generated/customer app. It may include identity, surfaces, theme, entities, plugin refs, permissions, billing, backend reference, and page/block trees.

Existing baseline: `docs/architecture-v2.md`.

## Module

An installable business capability. Similar to an Odoo addon or Shopify app, but Fayz-native and AI-readable.

Examples:

- `beautysoft.appointments`
- `restaurant.pos`
- `inventory`
- `crm`
- `commissions`

A module can contribute entities, views, actions, workflows, permissions, events, blocks, and agent capabilities.

## Plugin

A package that can contribute modules/capabilities to the Fayz runtime. In early docs, “plugin” and “module” can blur. Working distinction:

- **Module** = business capability definition.
- **Plugin** = package/distribution vehicle that may contain one or more modules plus code/registries.

This distinction should be validated before implementation.

## Entity

A business object and source-of-truth concept.

Examples:

- Customer
- Appointment
- Order
- Invoice
- Product
- InventoryItem
- StaffMember
- Table

## Field

A typed attribute of an entity.

Initial field types:

- text
- number
- boolean
- date
- datetime
- money
- enum
- relation
- json

## Relationship

A link between entities.

Initial relationship types:

- oneToOne
- oneToMany
- manyToOne
- manyToMany

## View

A UI intent over entities/workflows.

Initial view types:

- table
- form
- detail
- calendar
- kanban
- dashboard
- custom

View definitions should remain metadata. Rendering belongs to scaffolds/registries later.

## Block

A composable UI node in a page tree. Existing architecture v2 already treats pages as block trees.

Examples:

- hero
- kpi-grid
- entity-table
- form
- calendar
- product-grid
- custom:* block

## Action

An explicit operation that can change or query business state.

Examples:

- create appointment
- cancel appointment
- send order to kitchen
- record payment
- adjust inventory
- recalculate commission

Actions are the safe unit for humans, automations, and AI agents to operate the business system.

## Workflow

A stateful business process around an entity.

Examples:

- appointment lifecycle;
- order lifecycle;
- invoice lifecycle;
- purchase order approval.

Initial representation can be states + transitions only.

## Permission

A named capability required to view, execute, install, approve, or modify something.

Examples:

- `appointments.create`
- `appointments.cancel`
- `pos.recordPayment`
- `inventory.adjust`
- `plugins.install`
- `ai.executeHighRiskAction`

Permissions should include risk metadata even if enforcement comes later.

## Event

A fact that happened in the system.

Examples:

- `appointment.created`
- `order.paid`
- `stock.low`
- `invoice.overdue`

Events become the basis for automations, integrations, audit, analytics, and agent triggers.

## Agent Capability

A declaration of what an AI agent can inspect or do within a module.

Examples:

- inventory agent can suggest reorder;
- finance agent can flag anomalies;
- appointment agent can reschedule under approval;
- builder agent can propose module changes.

Agent capabilities should reference actions and permissions instead of bypassing them.

## Registry

The code-side catalog of components, blocks, metrics, providers, pages, tools, and other executable capabilities. Manifests reference registry IDs; they do not inline functions/components.

## Scaffold / Surface

A renderer for a manifest area.

Initial surfaces from existing architecture:

- admin;
- storefront;
- portal;
- headless/agent.
