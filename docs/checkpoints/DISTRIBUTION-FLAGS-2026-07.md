# Distribution-flags decision memo — July 2026

> **DECISION: ________________________________ (founder, at Checkpoint 1)**

Status: PROPOSAL · Author: devcenter loop (B3) · Scope: `private` /
`publishConfig` distribution flags across all SDK units. **This is a memo only —
no `package.json` field is changed by B3.** Any flag change happens later, by
hand, at or after Checkpoint 1.

## Framing & a doc discrepancy to resolve

The B3 brief names `docs/DISTRIBUTION.md` as the locked "substrate public /
products private" direction doc. **That file does not exist on this branch.**
The canonical, substrate-vs-products thesis actually lives in
[`docs/DIRECTION.md`](../DIRECTION.md) (Status: canonical, updated 2026-07-02)
and the root README's one-liner: *"Open-source foundation for building
professional… products."* This memo is framed against that thesis; **where a
`DISTRIBUTION.md` is expected to exist, treat this as flagging its absence** —
the direction it would encode is already implied by DIRECTION.md and should be
written up explicitly if the founder wants a standalone locked doc.

The thesis, read for distribution:

- **Substrate = the SDK itself** (engines + plugins in this repo). The README
  brands it an *open-source foundation*. Its value is adoption and the
  upgrade path, not license scarcity.
- **Products = the apps** built on the substrate (the `fayz-app/*` dogfood
  repos, sold as subscription). Those are the private, revenue-bearing layer —
  and they already live in **private git repos**, gated at the app layer, not at
  the npm registry.

Under that reading the private boundary belongs at the **product/app layer**,
which is already where it sits. The SDK packages are intended to be public. The
one genuine exception is `@fayz-ai/app-runtime`, an internal umbrella
re-export that is an implementation detail, not a supported surface.

## Per-unit table (34 units: 31 on this branch + 3 missing-source)

`npm` column: "published" = a public MIT version already exists on npm and
**cannot be retracted** (unpublish/deprecate only hides or warns). Where npm is
known to be **ahead** of this branch's source, both are shown. Branch source
versions are from `docs/plugin-catalog.json`; the four confirmed npm-ahead
versions (agenda 0.3.0, crm 0.3.0, blog 0.1.0, payments 0.1.1) are from the B3
brief.

### Packages (12)

| Unit | `private` | npm state | `fayz.status` | Proposed | Rationale |
|---|---|---|---|---|---|
| `@fayz-ai/sdk` | public | published (src 0.6.5) | beta | **public (keep)** | Substrate seam every generated app installs; the public front door. |
| `@fayz-ai/core` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate engine; open foundation by design. |
| `@fayz-ai/saas` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate multi-tenant layer; required by every app. |
| `@fayz-ai/ui` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate design layer; shared by all surfaces. |
| `@fayz-ai/auth` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate auth contract; needed at install time. |
| `@fayz-ai/db` | public | published (src 0.1.2) | beta | **public (keep)** | Substrate schema spine (+ migrations in tarball, A1). |
| `@fayz-ai/shop` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate commerce engine. |
| `@fayz-ai/storefront` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate storefront kit. |
| `@fayz-ai/courses` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate education engine (Wave 3 proof). |
| `@fayz-ai/portal` | public | published (src 0.6.0) | beta | **public (keep)** | Substrate member-portal scaffold. |
| `@fayz-ai/cli` | public | published (src 0.3.0; npm 0.2.0) | beta | **public (keep)** | The scaffolder; must be `npx`-runnable by anyone invited. |
| `@fayz-ai/app-runtime` | **private** | not published (private) | internal | **private (keep)** | Internal umbrella re-export; an implementation detail, not a supported surface. `private:true` already blocks publish. |

### Plugins (19)

| Unit | `private` | npm state | `fayz.status` | Proposed | Rationale |
|---|---|---|---|---|---|
| `@fayz-ai/plugin-tasks` | public | published (src 0.1.6) | beta | **public (keep)** | Capability-bar plugin; part of the open substrate. |
| `@fayz-ai/plugin-agenda` | public | published (npm 0.3.0 > src 0.1.8) | beta | **public (keep)** | Capability plugin; npm already ahead — retraction impossible. |
| `@fayz-ai/plugin-crm` | public | published (npm 0.3.0 > src 0.2.3) | beta | **public (keep)** | Capability plugin; npm already ahead. |
| `@fayz-ai/plugin-financial` | public | published (src 0.1.7) | beta | **public (keep)** | Capability plugin; flagship engine. |
| `@fayz-ai/plugin-forms` | public | published (src 0.1.5) | beta | **public (keep)** | Capability plugin. |
| `@fayz-ai/plugin-inventory` | public | published (src 0.1.6) | beta | **public (keep)** | Capability plugin. |
| `@fayz-ai/plugin-marketing` | public | published (src 0.1.6) | beta | **public (keep)** | Substrate plugin. |
| `@fayz-ai/plugin-menu` | public | published (src 0.2.3) | beta | **public (keep)** | Food-vertical substrate plugin. |
| `@fayz-ai/plugin-orders` | public | published (src 0.2.3) | beta | **public (keep)** | Food-vertical substrate plugin. |
| `@fayz-ai/plugin-tables` | public | published (src 0.2.3) | beta | **public (keep)** | Food-vertical substrate plugin. |
| `@fayz-ai/plugin-auth` | public | published (src 0.1.0) | preview | **public (keep)** | Visual/preview plugin; already public, low API-surface risk. |
| `@fayz-ai/plugin-automations` | public | published (src 0.2.2) | preview | **public (keep), `[experimental]`** | Preview plugin; README label already warns; keeping public matches npm. |
| `@fayz-ai/plugin-conversations` | public | published (src 0.2.3) | preview | **public (keep), `[experimental]`** | Preview plugin; same reasoning. |
| `@fayz-ai/plugin-courses` | public | published (src 0.2.2) | preview | **public (keep), `[experimental]`** | Preview admin plugin over the courses engine. |
| `@fayz-ai/plugin-dashboard` | public | published (src 0.1.5) | preview | **public (keep)** | Provides the `/` home surface + widget registry; substrate-adjacent. |
| `@fayz-ai/plugin-reports` | public | published (src 0.1.6) | preview | **public (keep), `[experimental]`** | Preview plugin. |
| `@fayz-ai/plugin-reputation` | public | published (src 0.2.2) | preview | **public (keep), `[experimental]`** | Preview plugin. |
| `@fayz-ai/plugin-shop` | public | published (src 0.2.4) | preview | **public (keep), `[experimental]`** | Preview admin plugin over the shop engine. |
| `@fayz-ai/plugin-sites` | public | published (src 0.2.2) | preview | **public (keep), `[experimental]`** | Preview plugin. |

### Missing-source units (3) — source on `feat/plugin-admin-foundation`

Not on this branch; already published to npm. They will flow into gates and the
catalog the moment their `package.json` lands on `main` (B2 will need to seed
`fayz.status` for them at merge — none carries it on the feat branch yet).

| Unit | `private` (feat) | npm state | `fayz.status` | Proposed | Rationale |
|---|---|---|---|---|---|
| `@fayz-ai/plugin-admin` | public | published (feat src 0.1.0) | *(unset on feat)* | **public; seed `preview` at merge** | Shell/config foundation plugin; scaffold stage. |
| `@fayz-ai/plugin-blog` | public | published (npm 0.1.0) | *(unset on feat)* | **public; seed `preview` at merge** | Website-surface plugin; already public MIT on npm. |
| `@fayz-ai/plugin-payments` | public | published (npm 0.1.1) | *(unset on feat)* | **public; seed `beta`/`preview` at merge** | Payments surface; already public MIT on npm. |

**Net proposal: no `private` flag flips.** `app-runtime` stays private; every
other unit stays public. The only forward action is seeding `fayz.status` on the
three feat-branch plugins when their source merges — which is a B2 follow-up, not
a distribution-flag change.

## Registry mechanism for private-network distribution

The immediate audience is an **invited private network**, and Dev Center v1
**blesses only today-public packages**. Three options were weighed:

**(a) Keep everything public, MIT (status quo).**
Simplest; exactly matches what is already on npm. `npx @fayz-ai/cli create …`
and `npm install @fayz-ai/*` work for every invitee with zero registry auth.
Tradeoff: the substrate is legible to anyone, not just the invited network — but
that is what "open-source foundation" already means, and the moat is the
*upgrade path and the hosted product*, not source secrecy.

**(b) GitHub Packages, restricted scope.**
Access-controlled by GitHub org membership. Tradeoff: every consumer needs a
`~/.npmrc` with a GitHub token and an `@fayz-ai:registry=` line; CI, the
scaffolder, and every dogfood app must be reconfigured; and it **cannot retract**
the versions already public on npm. High friction for an invited-developer
experience, for a boundary that source-public MIT versions have already crossed.

**(c) npm private packages + org teams.**
Paid npm org, `publishConfig.access: "restricted"`, per-team grants. Same
`.npmrc`/token friction as (b), same inability to retract already-public
versions, plus recurring cost. It buys real access control only for *future*
versions while the *current* ones stay public — a split-brain state that is hard
to explain to invited developers.

### Recommendation — **(a) keep everything public, MIT.**

Keep the substrate public and MIT, and enforce the private-network boundary at
the **product/app layer** (private `fayz-app/*` repos, invite-gated Dev Center,
hosted app access), not at the package registry. Three facts make this the
honest call: the substrate is already fully public on npm and MIT versions
**cannot be retracted**, so options (b)/(c) would only fence *future* versions
while leaving today's out in the open — buying friction, not secrecy; Dev Center
v1 explicitly blesses only today-public packages, so a public registry is
already the assumed substrate; and the invited-developer experience wants a
frictionless `npx`/`npm install`, which a token-gated private registry directly
undermines. This **matches the DIRECTION.md thesis** (open-source foundation,
paid products) rather than deviating from it. Revisit only if a specific package
must genuinely be withheld from the network — at which point it should be **born
private** (never published public), because retraction is not available after
the fact.

## Migration steps — only if a flag actually changes

None of the below runs under B3; recorded so a future flag flip is mechanical.

**If a unit flips public → private (born-private, never yet published):**
1. `package.json`: set `"private": true` and `fayz.status: "internal"`
   (`check:package-status` requires `private ⇔ internal`).
2. Ensure no release channel pins it: remove it from
   `packages/sdk/src/release-channels.json` (`check:release-channels` forbids the
   `stable` channel pinning an `internal` package).
3. Re-run `node scripts/emit-plugin-catalog.mjs` — the unit drops from the
   published surface in `docs/plugin-catalog.json`; commit the regenerated file.
4. Docs impact: the Dev Center will no longer generate a reference page for it
   (catalog-driven); add it to any private-plugins note if partners need it.

**If an already-public package must be walked back (best effort — cannot retract):**
1. `npm deprecate @fayz-ai/<pkg>@"<range>" "Not for external use — moved to the
   private product layer. See SUPPORT.md."` — warns on install; does **not**
   remove the code. (`npm unpublish` is limited to a 72-hour window and is not a
   real retraction path here.)
2. Set `"private": true` going forward to block *new* public versions, and set
   `publishConfig.access` / registry only if moving future versions to a
   restricted registry (options b/c) — coordinate with a global `.npmrc` change
   for CI and every dogfood app.
3. Update `release-channels.json`, regenerate the catalog, and note the change in
   `SUPPORT.md` and the CHANGELOG so downstream apps understand the deprecation.

**If a `fayz.status` changes (e.g. seeding the three feat-branch plugins at merge):**
1. Edit `fayz.status` in `package.json`; keep the README `Status:` line in sync
   (`check:package-docs` enforces the line's presence,
   `check:package-status` warns on drift).
2. Regenerate `docs/plugin-catalog.json`. No `private`/registry change implied.
