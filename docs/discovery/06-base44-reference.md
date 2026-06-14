# 06 — Competitive Reference: Base44 JavaScript SDK

## Source

Local repo: `/Users/fayalabs/dev/open-source/javascript-sdk`

Package:

- name: `@base44/sdk`
- description: JavaScript SDK for Base44 API
- repo: `https://github.com/base44/javascript-sdk`

## Initial observed shape

Base44's SDK is primarily an API client SDK. It exposes modules around platform capabilities such as:

- auth;
- users;
- entities;
- functions;
- integrations;
- custom integrations;
- connectors;
- agents;
- analytics;
- realtime/subscription behavior through socket utilities.

It uses:

- TypeScript;
- axios;
- socket.io-client;
- Vitest;
- Typedoc.

## What Fayz should learn from it

Base44 validates that an AI builder platform benefits from a public JavaScript SDK with clear API modules, tests, and docs.

We should study:

- API module boundaries;
- entity client shape;
- function/action invocation model;
- integration/connector abstractions;
- agent API surface;
- auth and app initialization ergonomics;
- test coverage patterns;
- docs generation.

## Where Fayz should exceed it

Base44 appears to be an API access SDK, not a full business-module definition framework.

Fayz's differentiated SDK should add:

- manifest-first app/module definitions;
- Odoo-like module/plugin concepts;
- SMB ERP primitives: entities, workflows, permissions, actions, events;
- Notion-like pages/block composition;
- community plugin packaging path;
- governance hooks for AI-generated and agent-executed business changes;
- vertical templates/examples for Beautysoft and restaurant/POS.

## Open comparison tasks

- Inspect Base44 `src/modules/entities.ts` and `entities.types.ts`.
- Inspect Base44 `src/modules/functions.ts` and `functions.types.ts`.
- Inspect Base44 `src/modules/agents.ts` and `agents.types.ts`.
- Inspect Base44 integration/connector modules.
- Produce a match/skip/exceed matrix before implementation.
