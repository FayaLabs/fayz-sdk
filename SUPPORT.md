# Support & stability tiers

Every Fayz package and plugin declares a **maturity tier**. The tier tells you
how much you can lean on a package today: how carefully we version it, how
complete its documentation is, and how quickly we respond when something breaks.
This page is the contract behind those tiers.

## Pre-1.0 caveat (read this first)

The Fayz SDK is pre-1.0. **Nothing is `stable` yet.** While a package sits on a
`0.x` version, [semantic versioning](https://semver.org/#spec-item-4) allows a
**minor** bump (`0.4.0` → `0.5.0`) to contain breaking changes, and we use that
latitude. Pin exact versions in production, read the CHANGELOG before upgrading,
and treat the tiers below as a statement of *intent and care*, not a promise of
frozen APIs. When a package reaches `1.0.0` its tier becomes a hard guarantee.

## The tiers

| Tier | What it means | Versioning & breaking changes | Docs coverage | Issue response | Release channels |
|---|---|---|---|---|---|
| **stable** | Production-ready. The API is settled and we stand behind it. | Post-1.0 semver: breaking changes only in a **major** bump, with a migration note. | Full reference + guides on the Dev Center. | Bugs triaged as a priority; regressions treated as incidents. | `stable`, `latest`, `preview` |
| **beta** | Real and in daily use, but the surface may still shift. This is the current default for the SDK's core and shipping plugins. | Best-effort compatibility within a minor line; a `0.x` **minor** may break — always changelogged. | Reference on the Dev Center; some guides may lag. | Bugs triaged on a normal cadence; breaking-change reports prioritized. | `latest`, `preview` (may also be pinned into the `stable` channel while pre-1.0) |
| **preview** | Early or experimental. Shape is expected to change; use it to explore, not to build on. | No compatibility promise between releases; APIs can change without a deprecation window. | Minimal — README and inline types; reference may be partial or absent. | Best-effort; feedback welcomed, fixes not guaranteed on a timeline. | `preview` |
| **internal** | Implementation detail. Not part of the supported public surface. | No promise of any kind; may change or disappear between releases. | Not documented for external use. | Not externally supported. | None — never pinned into a public channel. |

**Release channels are not the same as tiers.** `stable`, `latest`, and
`preview` are *version pin sets* — coherent groups of versions you can install
together — while the tier is a property of a single package. The one rule the
tooling enforces between them: the `stable` channel may never pin an `internal`
package.

## How to read a package's tier

Two sources, kept in sync by CI:

1. **`fayz.status`** in the package's `package.json` — the machine-readable
   tier (`stable` | `beta` | `preview` | `internal`).
2. **The `Status:` line** near the top of the package's `README.md` — the
   human-readable statement of the same tier.

Three checks in this repo keep those two honest and consistent:

- `check:package-status` — validates every `fayz.status`, requires
  `private` packages to be `internal` (and vice-versa), and forbids a
  visual-only plugin from claiming `beta`.
- `check:package-docs` — enforces the README floor, including the `Status:`
  line, so the human tier is always present.
- `check:release-channels` — enforces channel discipline, including that the
  `stable` channel may not pin an `internal` package.

If the `package.json` tier and the README `Status:` line ever disagree, trust
neither and open an issue — CI should have caught it.

## Getting help

Open an issue on the [fayz-sdk repository](https://github.com/FayaLabs/fayz-sdk).
Include the package name, its version, and its tier — the response you can
expect follows the table above.
