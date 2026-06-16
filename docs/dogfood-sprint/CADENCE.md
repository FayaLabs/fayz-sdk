# CADENCE — the iteration protocol (the loop runs this every 15 min)

You are one iteration of the dogfood sprint. Do exactly this, then stop. Keep it small —
finish inside one fire. The ledger is your memory; trust it over chat history.

## 1. Orient (read the ledger)
- Read `docs/dogfood-sprint/STATE.md`. Note: FOCUS app, the next unchecked task in its queue, any `BLOCKER:` / `FEEDBACK:` / `FOR THE HUMAN` notes.
- If STATE has a `FEEDBACK:` from the human, honor it first (it may reorder tasks or change scope).
- If the FOCUS app's queue is fully checked, mark its milestone done, move FOCUS to the next app, and write a `FOR THE HUMAN` checkpoint block for the finished app.

## 2. Pick ONE task
- Take the single next unchecked, unblocked task from the FOCUS app's queue in PLAN.md / STATE.md.
- If it's a HUMAN-CHECKPOINT task (live DB apply, visual login, real keys): do NOT attempt it. Write/refresh its `FOR THE HUMAN` block in STATE, check it off as "staged for human", and pick the next code task instead.
- Prefer tasks that are code-only and verifiable by typecheck/build/test.

## 3. Do the work (small, focused)
- App code lives in `/Users/fayalabs/dev/fayz-app/<app>` — its OWN git repo.
  - Before editing: ensure that repo is on branch `fay/dogfood-sprint`. Create it from `main` if missing: `git -C <app> switch -c fay/dogfood-sprint` (or `switch` if it exists). NEVER edit on `main`.
- SDK/plugin code lives in `/Users/fayalabs/dev/fayz-sdk` (current branch — already a sprint branch, not main).
- Follow the patterns: `fayz.data.*` for queries (see beauty-saas dashboard.tsx `countActiveBookingsForDay`), `createSafeDataProvider` + tenant-scoped tables for plugins, table prefixes + `tenant_id IN (SELECT public.user_tenant_ids())` RLS for migrations (see plugin-tasks). Honor [DATA-MODEL.md](DATA-MODEL.md).
- Migrations: author idempotent `.sql` files into `<app>/supabase/migrations/` (timestamp-prefixed). Do NOT apply them to live DBs — that's a human checkpoint.

## 4. Verify (only claim what you ran)
- Typecheck the touched package/app (`pnpm -C <app> typecheck` or the SDK equivalent). For SDK plugins also run the capability gate: `node scripts/check-plugin-capability.mjs`.
- If a test is the deliverable, run it (`vitest run`).
- Record the EXACT result (pass/fail + first error line). Never report success you didn't observe.
- If verification fails and you can't fix it in this iteration, revert the change or leave it uncommitted, record the blocker, and stop.

## 5. Commit (never push, never main)
- App code: `git -C /Users/fayalabs/dev/fayz-app/<app> add -A && git -C ... commit` on `fay/dogfood-sprint`. NEVER `git add .` of unrelated trees — stage only what this task touched.
- Ledger: commit STATE.md/LOG.md changes in `fayz-sdk` separately.
- Commit message: `sprint(<app>): <what> — <verify result>`. End with the Co-Authored-By trailer.
- NEVER `git push`. NEVER commit to `main` or `dev`.

## 6. Record (update the brain)
- Tick the task in STATE.md; set the next task; update FOCUS/milestone if changed.
- Append one line to LOG.md: `- <iso-ish time> · <app> · <task id> · <result> · <commit sha short> · <files>`. (You don't have wall-clock; use the iteration counter `#N` instead of a timestamp — increment from the last LOG line.)
- If you discovered a blocker, add `BLOCKER:` under the task in STATE.

## 7. Stop
- One task per fire. Do not loop. The next cron fire is the next iteration.

## Hard rules
- Never push; never touch `main`/`dev`; never destructive git; never `git add .` across a whole repo.
- Never search for secrets/service keys; never run SQL against a live DB.
- Every committed code change passed typecheck. If you can't verify, you don't commit.
- When unsure whether something is a human checkpoint, treat it as one and queue it.
