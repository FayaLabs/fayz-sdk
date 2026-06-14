# 12 — Rainy Weekend Operating Plan

## Mission

Use the weekend to move Fayz SDK from scattered ambition to a locked, reviewed, implementation-ready architecture — then start one narrow vertical slice that proves the idea without creating platform debt.

The mission is **not** to build the whole SAP/Odoo/Lovable platform in one branch.

The mission is:

> Lock the canonical manifest architecture, prove how Fayz will store/render a tenant-specific app surface, and prepare agents to implement safely.

## Working mode

Use files first, Linear later.

Why:

- We are still reducing ambiguity.
- Linear too early creates fake certainty and noisy execution.
- Bad architecture decisions here are expensive.
- File-based docs let Codex/Hermes/Vini review, critique, and revise quickly.

Linear should be created only after the architecture lock has enough confidence.

## Weekend stages

### Stage 0 — Stabilize context

**Goal:** Make sure all agents read the same source of truth.

**Inputs:**

- `docs/discovery/07-vini-mission-brief.md`
- `docs/discovery/08-current-codebase-findings.md`
- `docs/discovery/10-architecture-visuals.md`
- `docs/discovery/11-fayz-core-structure.md`

**Output:**

- Shared plan and agent prompts in this folder.

**Status:** in progress.

---

### Stage 1 — Research before coding

**Goal:** Use multiple Codex agents for research, not implementation yet.

Each research agent should return:

- current code paths;
- exact extension points;
- risks;
- recommended minimum change;
- files likely touched;
- tests/build commands;
- contradictions with the architecture docs.

No broad code changes in this stage.

**Research lanes:**

1. SDK manifest/provider lane.
2. Fayz API/editor Panel lane.
3. Generated project scaffold/AI agent guide lane.
4. Beauty SaaS migration/proof lane.
5. Existing package/design-system lane.

---

### Stage 2 — Architecture review and lock

**Goal:** Consolidate research into one locked implementation plan.

Lock only these decisions first:

1. Canonical manifest remains SDK `AppManifest`.
2. Fayz stores manifest bindings, not a new manifest shape.
3. Panel renders one `SurfaceManifest` from the canonical manifest.
4. Provider abstraction supports Fayz API without destroying Supabase/default usage.
5. First proof is a narrow manifest-driven Panel slice, not full plugin marketplace.

**Output:**

- `docs/discovery/20-architecture-lock.md`
- `docs/discovery/21-implementation-plan.md`

Do not start broad implementation before these are accepted.

---

### Stage 3 — First implementation slice

**Goal:** Build the smallest shippable proof.

Proposed slice:

```txt
AppManifest fixture
  -> Fayz API stores/resolves active manifest for project/customer/environment
  -> Fayz Panel fetches it
  -> Panel renders simple pages/plugins/sections
  -> invariant host-owned Cloud Features remain visible
```

This proves the concept without requiring Beauty SaaS migration, marketplace, or complex migrations.

---

### Stage 4 — Beauty SaaS proof

**Goal:** Apply the architecture to a real vertical.

Minimum demo:

- Beauty SaaS is represented by a manifest fixture or extracted partial manifest.
- Agenda page appears.
- Booking can be created/persisted using the chosen provider path.
- Manifest-only change affects visible UI/Panel surface.

This is the first customer-relevant proof.

---

### Stage 5 — Monday outcome

By Monday, the relevant outcome should be one of these:

**Best case:**

- Architecture locked.
- Panel manifest slice implemented or close.
- Beauty SaaS proof started.
- Clear demo path and remaining blockers.

**Acceptable case:**

- Architecture locked.
- Implementation plan precise enough for agents.
- No irreversible wrong code written.

**Bad case:**

- Many plugins started.
- No manifest decision locked.
- Fayz Panel, generated apps, and plugins diverge.
- Beauty/Tannat/Medusa/Cal.diy all half-started.

We should actively avoid the bad case.

## Decision gates

### Gate A — Before coding

Need answer:

- Are we aligned that `AppManifest` is canonical?
- Are we aligned that `ProjectAppManifest` or equivalent stores bindings/versions in Fayz API?
- Are we aligned that Panel renders a surface from the canonical manifest?

### Gate B — Before DB migration

Need answer:

- Table/model name.
- Key shape: project + tenant/customer + environment + surface.
- Versioning minimum.
- Rollback/audit minimum.

### Gate C — Before Beauty migration

Need answer:

- Beauty proof scope.
- Which pages must render.
- Which data provider path is acceptable.
- What demo counts as success.

## Hermes role

Hermes should act as CTO/operator for this weekend:

- keep docs coherent;
- spawn/review Codex research lanes;
- prevent premature implementation;
- summarize progress compactly;
- raise disagreements;
- ask Vini only the questions that unblock decisions;
- route product vs engineering updates to the right channels once target topics are confirmed.
