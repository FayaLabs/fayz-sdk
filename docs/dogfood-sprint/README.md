# Dogfood Sprint — make the four apps work e2e

**Goal.** Take four Fayz SDK dogfood apps from "boots with mock data" to **functional end-to-end**
on real Supabase, reusing SDK plugins, with a coherent data model and the freedom for an app to
own domain-specific code (e.g. resto) that still integrates with the SDK. Once an app is proven
e2e, we gain confidence the architecture solved the problem — **then we lock it and let Fayz
generate projects with this convention.**

**The four apps** (focus order — see [PLAN.md](PLAN.md)):
1. **beauty-saas** — real-client flagship; mines features from `~/dev/beautyplace`.
2. **pulse-store** — closest to done (shop RLS already secure); fast e2e validation.
3. **resto-saas** — restaurant community-plugin proof (app-owned domain code ↔ SDK).
4. **agency-os** — fresh Supabase, greenfield schema.

## How the loop works

A local cron fires every 15 minutes (≥12h). Each fire is one **iteration** that follows
[CADENCE.md](CADENCE.md): read state → do ONE small verifiable task → verify (typecheck/build/
tests) → commit on a sprint branch → update the ledger. Context survives across iterations and
context-compaction because **the ledger files are the brain**, not the chat history.

- **[STATE.md](STATE.md)** — live ledger: focus app, task queue, blockers, milestones. *Read first, every iteration.*
- **[LOG.md](LOG.md)** — append-only history of what each iteration did + verify result.
- **[PLAN.md](PLAN.md)** — per-app definition-of-done + milestones (the backlog).
- **[DATA-MODEL.md](DATA-MODEL.md)** — the archetype decision that all four apps follow.
- **credentials.local** — test account + Supabase project ids (gitignored).

## What the loop does vs. what it leaves for you

The loop does **safe, deterministic, verifiable** work: wires real queries, authors migrations
and seed scripts as files, writes tests, runs typecheck/build/capability gates, and commits.

It does **not** do privileged or visual steps autonomously. Those become **HUMAN CHECKPOINTS**
queued in STATE.md → "FOR THE HUMAN":
- applying migrations to live Supabase (`supabase db push`)
- logging in with the test user and eyeballing the UI
- pasting real service keys / project refs

This is by design — it's also where your milestones live. When an app reaches a checkpoint,
**stop, run the checkpoint, give feedback in STATE.md, and the loop continues.**

## Controlling the loop

- **Pause:** it's a session cron — interrupt this Claude session, or run `CronDelete`.
- **Steer:** edit STATE.md (reorder apps, add/remove tasks, drop a `BLOCKER:` or `FEEDBACK:` note). The next iteration reads it.
- **Resume:** the cron keeps firing while this Claude session is idle and running. Leave it open.
- **Branches:** app code lands on `fay/dogfood-sprint` inside each app repo (never `main`, never pushed). Ledger lands on the current `fayz-sdk` branch.

## Guardrails (never crossed)

- Never commit to `main`; never `git push`; never force/destructive git.
- Never hunt for credentials or run destructive SQL against live DBs.
- One small task per iteration; if blocked, record the blocker and move to the next unblocked task.
- Every code change must pass typecheck before commit.
