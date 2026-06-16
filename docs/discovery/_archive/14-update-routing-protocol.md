# 14 — Update and Routing Protocol

## Principle

Updates should be compact, decision-oriented, and routed by audience.

Do not spam raw logs. Do not paste huge diffs. Do not send every Codex thought.

## Channels

Current known preference from Fayz Mission Control:

- Product/company reports: `@product/topic 5`
- Engineering/PR updates: `topic 10`

Before sending to a specific topic/channel, Hermes should verify the actual delivery target with `send_message(action='list')` if needed.

## Product updates

Use Product topic for:

- architecture decisions;
- milestone status;
- Vini questions;
- demo readiness;
- customer/product implications;
- tradeoff decisions.

Format:

```md
## Fayz SDK — Product Update

Status: green/yellow/red
KPI/indicator: <what this moves, or KPI: none>

What changed:
- ...

Decision needed:
- ...

Risk:
- ...

Next:
- ...
```

## Engineering updates

Use Engineering topic for:

- agent lane started/completed;
- build/test status;
- file paths touched;
- blockers;
- PR/branch/worktree state;
- verification commands.

Format:

```md
## Fayz SDK — Engineering Update

Lane: <name>
Status: green/yellow/red
Branch/worktree: <path>

Done:
- ...

Touched/inspected:
- ...

Verification:
- ...

Blockers:
- ...

Next:
- ...
```

## Cadence

For active weekend work:

- Send update when a research lane completes.
- Send update before switching from research to implementation.
- Send update after architecture lock.
- Send update after each implementation slice build/test.
- Send immediate update for high-risk blockers or disagreement.

Do **not** send time-based noise every 15 minutes.

## Hermes decision behavior

Hermes should ask Vini only questions that unblock irreversible decisions.

Good questions:

- “Can we lock `AppManifest` as the canonical contract?”
- “Can we name the DB model `ProjectAppManifest`?”
- “Is Beauty agenda booking enough for Monday demo?”

Bad questions:

- “Should I continue?”
- “Do you want me to inspect files?”
- “Should I write docs?”

Hermes should default to action where reversible, and ask where irreversible.

## Status colors

- **Green:** on track, no important decision blocked.
- **Yellow:** progress, but a decision/risk is blocking the next step.
- **Red:** current approach risks architectural debt, broken demo, or wasted agent work.

## What not to include

Avoid:

- raw git status dumps;
- huge Codex logs;
- unreviewed conclusions;
- long philosophical architecture essays;
- more than 1–3 decision asks per update.

## Current weekend stance

Status: **yellow by design**.

Reason: we intentionally slow down implementation until manifest/provider/Panel decisions are locked.

The work is healthy if:

- docs get clearer;
- research agents disagree early;
- we delete/simplify scope;
- first implementation slice remains narrow.

The work is unhealthy if:

- multiple agents start broad edits;
- plugin modules begin before manifest lock;
- Fayz Panel invents a separate config shape;
- Beauty/Tannat/Medusa/Cal.diy all start at once.
