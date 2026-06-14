# Fayz SDK Discovery Workspace

This folder is the working area for turning Vini's long-form prompts, market references, and architecture ideas into an executable SDK plan.

## Purpose

We are using `~/dev/fayz-sdk` as the discovery + implementation workspace for the Fayz SDK. The SDK should become the typed, manifest-first foundation for AI-native business software: modules, entities, workflows, actions, permissions, events, surfaces, plugins, and AI-agent-safe capabilities.

The goal is not to design the final SAP-scale platform now. The goal is to define the minimum durable concepts that let Fayz validate the category with real verticals, while leaving clear upgrade paths.

## Files

### Core discovery

- `00-intake-log.md` — raw input blocks from Vini, preserved with source and date.
- `01-product-brief.md` — synthesized product/category framing.
- `02-architecture-principles.md` — non-negotiables and design constraints.
- `03-concept-map.md` — glossary of platform primitives.
- `04-phase-plan.md` — ordered phases from discovery to implementation.
- `05-open-questions.md` — decisions we should not fake yet.

### References and mission capture

- `06-base44-reference.md` — competitive SDK reference notes.
- `07-vini-mission-brief.md` — structured capture of the weekend mission.
- `08-current-codebase-findings.md` — inspected codebase facts.
- `09-linear-structure.md` — proposed Linear structure, parked until architecture lock.

### Weekend operating system

- `10-architecture-visuals.md` — Mermaid diagrams for architecture discussion.
- `11-fayz-core-structure.md` — recommended `@fayz/core`/repo boundaries.
- `12-weekend-operating-plan.md` — staged weekend work plan.
- `13-codex-research-lanes.md` — Codex research prompts and lane definitions.
- `14-update-routing-protocol.md` — update format/cadence for Product and Engineering topics.
- `15-72h-supervision-protocol.md` — durable Hermes/Codex supervision loop.
- `16-active-run-state.md` — current run state, process ids, cron id, constraints.
- `17-progress-log.md` — append-only progress log.
- `20-architecture-lock.md` — locked minimal architecture for weekend slice.
- `21-implementation-plan.md` — concrete workstreams and verification.
- `22-decisions-from-codex-open-questions.md` — working defaults for research questions.
- `23-milestone-packaging-plan.md` — commit/review packaging plan for turning the dirty weekend branches into coherent milestone slices.
- `24-runtime-oauth-helper-contract.md` — agent-safe contract for `createFayzRuntimeClient()` and OAuth-backed provider calls.

## Working method

1. Paste each large prompt block into the conversation.
2. I will append a cleaned summary to `00-intake-log.md` and extract durable decisions into the other docs.
3. When enough inputs are captured, I will turn the docs into a concrete implementation plan with file paths, tasks, tests, and validation.
4. We only implement after the foundation is coherent enough to avoid rework.

## Current baseline

Existing architecture docs already point toward a **manifest-first** SDK:

- `docs/architecture-v2.md`
- `docs/customization-ladder.md`
- `docs/architecture-blueprint.md`

This discovery workspace should refine, not duplicate blindly. If new ideas conflict with existing architecture, we record the decision explicitly.
