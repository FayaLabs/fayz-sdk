# 15 — 72-Hour Supervision Protocol

## Stance

Vini explicitly asked Hermes to stop asking low-value questions and keep work moving. Questions should be reserved for decisions that are irreversible or genuinely blocked.

## How persistence works

Hermes persistence for this weekend uses three layers:

1. **File-based state**
   - Durable docs under `docs/discovery/`.
   - Research outputs under `docs/discovery/research/`.
   - This is the source of truth across sessions, context compactions, and agent restarts.

2. **Background Codex processes**
   - Codex lanes run as background processes with completion notification.
   - Each lane writes a markdown report to a known path.

3. **Hourly Hermes cron supervisor**
   - A recurring cron job inspects repo/docs/process state and sends compact updates.
   - It does not depend on this chat context.
   - It reads the current docs from disk each run.

4. **Codex thread heartbeat**
   - Automation id: `fayz-sdk-weekend-autonomous-loop`.
   - Runs every 5 minutes as fallback/resume for the active Codex thread.
   - It is not the main worker. The foreground Codex session should keep executing continuously whenever available.
   - If the heartbeat fires, it should do a real unit of work, update docs, and avoid becoming a no-op status bot.

## Current active Codex lanes

- SDK manifest/provider contract
  - output: `docs/discovery/research/sdk-manifest-provider.md`
- Fayz API/editor Panel integration
  - output: `docs/discovery/research/fayz-panel-api.md`
- Generated project scaffold + agent guide
  - output: `docs/discovery/research/generated-project-scaffold.md`
- Beauty SaaS proof path
  - output: `docs/discovery/research/beauty-proof.md`
- Package/design-system hardening
  - output: `docs/discovery/research/package-design-system.md`

## Supervisor duties

Every hourly run should:

1. Read `docs/discovery/16-active-run-state.md` first. Treat it as the fast resume snapshot.
2. Inspect git status compactly in:
   - `/Users/fayalabs/dev/fayz-sdk`
   - `/Users/fayalabs/dev/fayz`
   - `/Users/fayalabs/dev/fayz-app/beauty-saas`
3. Inspect recent command/test/server logs when available.
4. Check whether the previous run repeated work, stalled, or spent time on unnecessary broad scanning.
5. Update `docs/discovery/17-progress-log.md` with any material result or self-improvement note.
6. Continue the narrowest unblocked implementation/review task.
7. Send compact update to origin thread.
8. Avoid raw logs unless there is a failure.

## Self-improvement rule

Each automated execution must ask:

- Did the last run repeat expensive discovery that was already documented?
- Did a command hang, run too broadly, or fail for a known environmental reason?
- Can the next run use a narrower command, a more targeted test, or a clearer doc pointer?
- Did the docs give a fast enough summary for mobile review?

If the answer changes execution strategy, update `16-active-run-state.md` or `17-progress-log.md` immediately.

## When to ask Vini

Ask only if:

- DB model/table name is ready to lock;
- a migration needs to be created/applied;
- broad implementation is about to start;
- two research findings conflict on architecture;
- a Codex lane reports a risk that changes the strategy.

## Default decisions unless contradicted

- Use SDK `AppManifest` as canonical contract.
- Store manifest bindings in Fayz API; recommended model name `ProjectAppManifest`.
- Panel renders one `SurfaceManifest`, not a new Panel-only schema.
- First implementation proof is a narrow Panel manifest slice.
- Beauty SaaS is first vertical proof after Panel slice.
- No Medusa/Cal.diy implementation before core lock.
- No Linear mutation before architecture lock.

## Update style

Use the protocol in `14-update-routing-protocol.md`:

- compact;
- status color;
- what changed;
- next action;
- only decision asks that matter.
