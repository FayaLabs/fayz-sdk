# 01 — Product Brief

## Working name

**Fayz SDK** — the manifest-first foundation for AI-native business software.

## Category thesis

Fayz is not merely adding AI to ERP. Fayz is building the foundation for companies to create, customize, install, and operate their own business software through AI, reusable modules, plugins, and community builders.

The near-term category language:

> AI-native customizable ERP platform.

The broader ambition:

> A programmable business operating system for the AI era.

## Problem

Business software customization is still slow, expensive, and consultant-heavy. Traditional ERP systems are powerful but rigid. AI app builders are fast but often generate ungoverned, hard-to-maintain code.

Companies need a middle path:

- faster than SAP/Odoo-style implementations;
- more governed than vibe-coded business apps;
- more customizable than vertical SaaS;
- safe enough for real business operations;
- open enough for a plugin/community ecosystem.

## Target user archetypes

### 1. Business operator

A founder, COO, franchise owner, restaurant operator, clinic/beauty operator, or internal ops lead who needs software adapted to their process.

Needs:

- business workflows that match reality;
- fast changes without months of implementation;
- trust, permissions, audit, and rollback;
- reports and agent assistance.

### 2. Builder / implementation partner

A technical or semi-technical builder who creates modules, vertical templates, plugins, and customizations for clients.

Needs:

- clear SDK contracts;
- reusable modules;
- documentation;
- extension points;
- validation;
- eventual marketplace/distribution.

### 3. Fayz AI agent

The generation and customization system itself.

Needs:

- a vocabulary to generate structured apps;
- schemas to validate outputs;
- safe primitives for actions/workflows/permissions;
- module metadata that agents can inspect and modify.

## Initial vertical proof points

Use real verticals to avoid abstract platform overbuild:

### Beautysoft

Service/franchise operations:

- customers;
- appointments;
- staff;
- services;
- inventory;
- commissions;
- campaigns;
- franchise units.

### The Chef / restaurant POS

Restaurant operations:

- tables;
- orders;
- menu items;
- kitchen flow;
- payments;
- inventory;
- suppliers;
- cash register.

## Product principle

Start with a small foundation that makes Fayz-generated apps structured and governable.

The question for v1 is not:

> Can we build the full SAP replacement?

The question is:

> Can Fayz represent business software as validated, inspectable, reusable modules instead of loose generated code?

## Competitive frame

Fayz is competing with Lovable/Base44 on AI app generation speed, but should differentiate through a deeper SDK/platform thesis:

- generated apps are structured around durable business primitives;
- apps can be extended through modules/plugins;
- community builders can package reusable SMB ERP capabilities;
- pages/blocks feel Notion-like for composition;
- business operations stay governable through actions, permissions, events, and audit hooks.

Base44's JavaScript SDK should be treated as a reference point, not a ceiling. The discovery should identify what we match, what we skip, and where Fayz must be more ambitious.

## Success criteria for first SDK phase

- A module can be described as structured TypeScript/JSON-compatible data.
- The core primitives are clear and documented.
- Example modules prove the model across at least two verticals.
- Validation catches obvious module mistakes before runtime.
- AI prompts can later target this vocabulary.
- The design does not lock us out of future runtime, marketplace, permissions, audit, or agent execution.
- The architecture can be explained as a weekend single-branch mission with clear checkpoints and non-scope.
