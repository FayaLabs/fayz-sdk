---
name: release-sdk
description: Release the @fayz-ai SDK + plugins and roll the new versions out to the dogfood apps. Use when the user asks to publish/republish packages, cut a release, bump the SDK version, or "update the dogfood apps to latest". Covers version bump → build → publish → sync every app repo (commit+push) → final report.
---

# Release the SDK + roll out to dogfood apps

End-to-end release: publish the `@fayz-ai/*` packages, then bump every dogfood app's
deps to the freshly published versions and push each app repo. `sync-apps.mjs` (next
to this file) automates the app half — the mechanical part that ate ~an hour by hand.

## Topology (know this first)

- **SDK repo** — this repo, `/Users/fayalabs/dev/fayz-sdk`. `packages/*` + `plugins/*`,
  pnpm workspace, changesets. `pnpm release` = `turbo build && changeset publish`,
  `.changeset/config.json` `access: public`.
- **Dogfood apps** — sibling repo dir `/Users/fayalabs/dev/fayz-app/<app>`. **Each app is
  its own git repo** (not a workspace) with `@fayz-ai/*` as normal npm deps. They run
  local SDK src at runtime via `fayzVite` aliases but typecheck against published npm —
  so the published version is what matters.
- Apps live on **different branches** (e.g. beauty-saas on `main`, course-admin on
  `feat/course-platform`). Push each to its **own current branch** — never switch it.

## Procedure

### 1. Version bump (SDK)
Bump the packages you changed. Two ways:
- **Changesets** (preferred when there are `.changeset/*.md` files): `pnpm changeset version`.
- **Manual** (what we've been doing for coordinated bumps like 0.6.6): set `version` in each
  target `package.json`. Keep the app-facing five aligned: `core`, `ui`, `saas`, `auth`, `sdk`.

### 2. Un-private any package you need to publish  ⚠️ front-door gotcha
The repo uses a **front-door model**: at times most packages carry `"private": true` so only
`@fayz-ai/sdk` publishes. `changeset publish` **silently skips private packages** — that's why
a publish can "succeed" having shipped nothing. Before publishing, confirm the packages you
want are NOT private:
```bash
for f in packages/*/package.json plugins/*/package.json; do
  node -e "const p=require('./$f');p.private&&console.log('PRIVATE:',p.name)"
done
```
If you must un-private, **remove the whole `"private": true` line** — and if it was the last
key in the object, delete the now-dangling comma too. (A regex that strips the line but leaves
`"license": "MIT",\n}` produces invalid JSON and breaks `pnpm install` — this cost us a bad
commit on `main`.) Validate every file you touched: `node -e "require('./<f>')"`.

### 3. Publish — from an isolated worktree  ⚠️ don't disturb other lanes
Other sessions/lanes may be live in the main working dir. **Never `git stash`/`checkout` the
shared working dir.** Do the publish in a throwaway worktree:
```bash
git worktree add /Users/fayalabs/dev/fayz-sdk-rel <ref>   # e.g. origin/main after your bump commit
cd /Users/fayalabs/dev/fayz-sdk-rel
pnpm install --prefer-offline
pnpm release        # turbo build && changeset publish
```
Commit the version-bump + un-private changes to `main` before/with this (apps resolve from npm,
but the SDK repo should reflect what was shipped).

### 4. Verify what actually landed on npm
The publish log can truncate; confirm every intended package independently:
```bash
for p in core ui saas auth sdk db plugin-agenda plugin-crm plugin-dashboard \
         plugin-financial plugin-forms plugin-inventory plugin-marketing \
         plugin-reports plugin-tasks; do
  echo "@fayz-ai/$p = $(npm view @fayz-ai/$p version 2>/dev/null || echo MISSING)"
done
```

### 5. Roll out to the dogfood apps (automated)
```bash
node /Users/fayalabs/dev/fayz-sdk/.claude/skills/release-sdk/sync-apps.mjs            # all apps
node .../sync-apps.mjs beauty-saas agency-os course-admin                             # subset
node .../sync-apps.mjs --dry                                                          # preview, no git
```
For each app it bumps every `@fayz-ai/*` dep to the latest **published** version, commits, and
pushes to the app's current branch — **rebasing once** if the remote moved. Deps whose package
isn't on npm (e.g. a parallel lane's package this release didn't touch) are left untouched and
reported as `skipped`. It never downgrades and never touches non-`@fayz-ai` deps.

### 6. Clean up + report
```bash
cd /Users/fayalabs/dev/fayz-sdk && git worktree remove /Users/fayalabs/dev/fayz-sdk-rel --force
```
Final report to the user: published versions (step 4), and the sync report table (per app:
branch, deps bumped, skipped, push result).

## Gotchas cheat-sheet
- **zsh doesn't word-split unquoted `$vars`** — `for p in $pkgs` iterates once over the whole
  string. Use an explicit `for p in a b c` list, a Node/Python loop, or `${=pkgs}`.
- **`changeset publish` skips `private:true`** silently → "success" that shipped nothing. Check first.
- **Removing `"private": true` can leave a trailing comma** → invalid JSON → `pnpm install` fails.
- **Publish log truncates** → always verify with `npm view` per package.
- **App push non-fast-forward** (remote moved) → `git pull --rebase origin <branch>` then re-push.
  `sync-apps.mjs` does this automatically.
- **Isolation**: publish in a git worktree; never stash/checkout the shared working dir.
