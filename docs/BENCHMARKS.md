# BENCHMARKS — what other ecosystems got right and wrong

Status: reference · Updated: 2026-07-06
Owner-of-truth: external research (sources linked inline); OSS references at `~/dev/open-source/`

This is the evidence document. Every architectural position in the other docs that leans on ecosystem history cites this file instead of repeating the argument. It answers three questions: why WordPress declined, what Shopify did right, and what the adjacent ecosystems (VS Code, Figma, Odoo, Salesforce, Medusa, Cal.com, Base44, the AI builders) teach us. It ends with the twelve transferable rules that [BEST-PRACTICES.md](BEST-PRACTICES.md) operationalizes.

---

## 1. WordPress: a post-mortem

WordPress is the most successful plugin platform ever built and the most instructive failure. Its market share has been falling since late 2025 (41.9% and dropping — the decline began the quarter after the WP Engine governance crisis started), and 74% of developers working with it say they would prefer to switch ([Search Engine Journal](https://www.searchenginejournal.com/wordpress-market-share-in-decline/576042/), [GDM Pixel](https://www.gdm-pixel.com/articles/website-creation/is-wordpress-really-in-decline/)).

### 1.1 Plugins as the attack surface

- **More than 90% of all WordPress vulnerabilities are in plugins and themes, not core** ([Patchstack](https://patchstack.com/database/statistics/wordpress/all)). ~8,000 new plugin vulnerabilities in 2024; 43% exploitable without authentication.
- **59.3% of directory plugins are abandoned** (untouched 2+ years); 22.7% were never updated after upload; abandoned plugins stay downloadable ([analysis](https://fuadalazad.com/wordpress-plugin-crisis/)). Review happens once, at listing, and never again.
- The root cause is architectural: a WordPress plugin is **arbitrary PHP executing in-process with full privileges** — same memory space, same DB credentials, same global namespace as core. There is no capability model. Any plugin can do anything core can.
- The reputational transfer is total: users say "WordPress got hacked," never "plugin X got hacked." **The ecosystem's security failures become the platform's reputation.**

### 1.2 Hooks: composability without contracts

The hook/filter system built the 60k-plugin ecosystem — and is also why it rotted. Hooks are untyped callbacks into a global namespace: nothing enforces return types, "filters should not have side effects" is a convention, `!function_exists()` guards mean load order decides which implementation wins, and two plugins hooking the same point clobber each other silently. The platform has no dependency or conflict introspection — the official debugging method is *disable plugins one by one* ([WP hooks handbook](https://developer.wordpress.org/plugins/hooks/), [plugin-conflict guides](https://blogvault.net/plugin-conflict-wordpress/)). As the Etch team put it: ["WordPress's deepest technical problems are architectural and the project keeps treating them as cosmetic"](https://etchwp.com/blog/wordpress-architecture-crisis/) — 857 carousel plugins, everyone rebuilding the same feature, users trapped in decisions made years ago.

### 1.3 Gutenberg: breaking the extension contract

WP 5.0 forced the block editor as default while effectively beta. Because there was no versioned extension API, modernizing the editor *necessarily* broke themes and plugins across millions of sites, with no migration window; feedback was met with canned responses ([WP Tavern](https://wptavern.com/where-gutenberg-went-wrong-theme-developer-edition)). The lesson is not "don't modernize" — it's that **the absence of a versioned contract makes evolution traumatic**.

### 1.4 Governance is architecture

In 2024–2026, one person (who personally owns WordPress.org — not the Foundation) cut a competitor off from update infrastructure, expropriated the ACF plugin, and deactivated critics' accounts; litigation is still live ([TechCrunch explainer](https://techcrunch.com/2025/01/12/wordpress-vs-wp-engine-drama-explained/), [timeline](https://wpvswpe.report/)). Premium plugin vendors reported reduced sales — "hesitant to invest in an unstable ecosystem." **The single point of failure wasn't code; it was that the registry, the distribution channel, and the dispute arbiter were the same person.** Third parties invest in a marketplace only if the rules can't change retroactively against them.

### 1.5 Why users actually left

Not features — **operational burden**. WordPress outsources hosting, patching, conflict resolution, and security to the user. Wix/Squarespace/Shopify sell "we run it." Fayz's model — SDK updates published centrally and rolled out to apps — is on the right side of this; keep it that way as third-party plugins arrive.

### Design mistakes fayz must not repeat

1. Untyped, convention-only extension points.
2. Plugins executing with full platform privileges — no capability model in the manifest.
3. Global shared namespace/state; load-order-dependent behavior.
4. One-time marketplace review; no re-scan, no abandonment policy, no forced deprecation.
5. No conflict/composition introspection.
6. Breaking the extension contract without versioning and migration windows.
7. Registry + distribution + dispute resolution concentrated without process.
8. Letting plugin security failures become the platform's reputation.

---

## 2. Shopify: the copy list

Shopify ran the same experiment as WordPress with the opposite governance and won the trust of the exact market fayz wants (small businesses whose revenue runs through the platform).

### 2.1 From unrestricted injection to typed extension points

Early Shopify allowed arbitrary HTML/JS in checkout (`checkout.liquid`, ScriptTags). Result: apps conflicted, every platform update broke customizations, and third-party code ran on payment pages. Shopify **deprecated all of it** (checkout.liquid killed Aug 2024; ScriptTags sunset through 2026) and replaced it with reviewed, sandboxed extension points: Checkout UI Extensions (declared components rendered by Shopify), **Shopify Functions** (backend logic compiled to WASM — input is a declared data slice, output is **declarative JSON operations the host executes**; no network, no DB, no side channels), and sandboxed Web Pixels ([checkout extensibility](https://www.shopify.com/partners/blog/checkout-extensibility), [WASM engineering](https://shopify.engineering/shopify-webassembly)). What they bought with the lost freedom: **the platform can now upgrade checkout underneath everyone's customizations**, because the contract is declarative. The ecosystem accepted it because the sanctioned paths were good.

> The single strongest pattern for fayz's future community-plugin runtime: **untrusted logic sees only the data it declared, and returns a description of what it wants done — the host executes.**

### 2.2 Built for Shopify: quality tiers tied to distribution

All apps pass review; **Built for Shopify** is an *earned* tier with measurable bars (rating threshold, ≤10-point storefront speed impact, LCP ≤ 2.5s, latest App Bridge), **re-audited at least annually** with 60 days to fix or lose the badge — and rewarded with distribution (+49% installs in 14 days) ([requirements](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements)). Quality is legible and pays.

### 2.3 Versioned APIs with deprecation windows

Quarterly date-named API versions, each supported ≥12 months with ≥9 months of overlap; deprecations announced with migration guides, surfaced in tooling, and apps that stay on removed versions are **delisted** ([versioning](https://shopify.dev/docs/api/usage/versioning)). This is the anti-Gutenberg: change is constant but scheduled and enforced, so it never becomes betrayal.

### 2.4 Polaris: the design system as contract

Polaris is design guidance + tokens + components + API docs; extensions render with it, so every third-party app *feels native* and platform-wide restyles propagate without breaking anyone ([Polaris](https://polaris-react.shopify.com/)). The fayz analog is `@fayz-ai/ui` as the only rendering vocabulary for plugins (see [THEMES.md](THEMES.md)).

### 2.5 Metafields/metaobjects: schema extension without DB access

Shopify apps never touch the database. Metafields are typed, app-owned custom columns on core resources; metaobjects are whole custom types with auto-generated admin UI and API ([docs](https://shopify.dev/docs/apps/build/metafields)). The fayz analog: plugins declare schema in the manifest → platform-generated migrations + RLS in the plugin's own namespace, with the archetype/`v_*` discipline for core data (see [DATA-MODEL.md](DATA-MODEL.md)).

### 2.6 The philosophy

**Merchant outcomes over developer freedom** — constrain the surfaces where the operator's money is at stake (checkout, payments, security); be liberal everywhere else (Hydrogen for headless freedom). For fayz: payments/auth/RLS are guardrail zones, UI composition and workflows are freedom zones (see [SECURITY.md](SECURITY.md)).

---

## 3. Adjacent ecosystems

### VS Code — why the extension model scaled

Manifest-first (`contributes` = declarative UI contributions rendered by the workbench; `activationEvents` = lazy loading, extensions dormant until relevant); all extensions run in a **separate extension-host process** — a crashing extension cannot crash the editor; the API surface is curated (no DOM access, ever) ([extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy), [extension host](https://code.visualstudio.com/api/advanced-topics/extension-host)). Counter-lesson: even this architecture doesn't protect the *user* — the marketplace has an active malware problem despite scanning, so **continuous re-scan + revocation (kill switch) is mandatory, not optional** ([Microsoft on marketplace trust](https://developer.microsoft.com/blog/security-and-trust-in-visual-studio-marketplace)).

### Figma — real boundaries, not JS tricks

Figma's first plugin sandbox (a JS Realms shim) was repeatedly escaped; they replaced it with **QuickJS compiled to WASM** — a true VM ([post-mortem](https://www.figma.com/blog/an-update-on-plugin-security/)). Lesson: JS-level sandboxing conventions fail; when fayz eventually runs untrusted community logic, use a real boundary (edge function / process / WASM).

### Odoo — quality variance at 30k modules

Odoo's `_inherit` lets any module override any model's method: powerful, and the reason every major upgrade breaks most third-party modules. The killer bug class is **module interaction** — two modules that each work alone override the same method and silently drop each other's logic; unit tests never catch it because each module is tested against vanilla Odoo, not the 40-module production composition ([audit guide](https://octurasolutions.com/resources/odoo-19-third-party-module-compatibility-audit-test-and-upgrade-oca-apps)). Lessons: extensions must be **scoped and attributable** (no monkey-patching), and CI must **test the composition, not just the plugin** (see [TESTING.md](TESTING.md)). What Odoo got right is mined in §4.

### Salesforce AppExchange — review as a moat

Mandatory security review before listing (pentest + static analysis, 4–8 weeks, most fail first pass) plus periodic re-review ([ISVforce guide](https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/security_review_how_it_works.htm)). Enterprises trust AppExchange *because* it's strict. Fayz should get the same trust by **automating** the equivalent (capability contract + doctor + RLS checks as the machine reviewer) rather than running 6-week human reviews (see [MARKETPLACE.md](MARKETPLACE.md)).

### The AI builders (Lovable, Bolt, v0, Base44) — the generation fayz competes with

- **Security by default is the differentiator.** CVE-2025-48757: 170+ Lovable-generated apps (10.3% of those scanned) had Supabase tables readable by unauthenticated requests because generated tables shipped without correct RLS; the follow-up scanner checked RLS *presence*, not correctness ([breakdown](https://www.superblocks.com/blog/lovable-vulnerabilities)). Industry estimates put exploitable vulnerabilities in ~80% of AI-generated apps. **Fayz's structural edge: generated apps compose audited plugin engines with RLS baked into the plugin schema contract, instead of generating bespoke security-critical code per app.** This is the strongest positioning claim the evidence supports.
- **Regeneration is not an upgrade path.** Prompt-generated codebases accumulate debt fast; every builder in this class eventually hands off a codebase the customer hardens alone. Versioned plugins are an upgrade path.
- **Base44** (acquired by Wix for ~$80M) won its funnel by making backend/auth/integrations built-in rather than wired-up — but its backend lock-in is a dealbreaker for customers who carry real revenue. The trust wedge against it: **"your Supabase, your Postgres" — with real export tooling** (see [OPERATIONS.md](OPERATIONS.md)).
- **None of them has third-party plugin extensibility.** A reviewed, versioned marketplace for generated apps is the open flank fayz is aiming at.

---

## 4. OSS reference mining (repos at `~/dev/open-source/`)

Architecture ideas verified directly in source, feeding specific fayz contracts:

### Medusa (`medusa-commerce/`)

- **`defineLink` — no cross-module FKs.** Each module owns its tables and never FK-references another module; relations are declared as separate link tables resolved by a graph query layer (`query.graph`). Maps directly onto fayz's per-plugin prefixed tables: no cross-plugin FKs → independent install/uninstall ([DATA-MODEL.md](DATA-MODEL.md) §cross-plugin data). Cost to respect: reads go through the query layer, not raw SQL joins.
- **Per-module migrations**: timestamp-named migration files in each module's `src/migrations/`, run independently by the loader — the shape fayz's `manifest.migrations[]` standardizes.
- **Closed enum of admin injection zones** + `defineWidgetConfig({ zone })` — fayz's `WidgetZone` is the same idea; keep the zone set closed.
- Anti-pattern observed: filesystem-scan + virtual-module codegen magic in the admin — opaque, errors surface far from the source. Prefer explicit manifest declaration.

### Odoo (`odoo/`)

- **`__manifest__.py` is the gold-standard declarative capability contract**: `depends`, ordered `data` files, `assets`, `installable`, pre/post/end install hooks — everything a module contributes enumerated in one inspectable file.
- **`auto_install` glue modules**: a bridge module installs itself when all its trigger modules are present (e.g. `account_fleet` when `account` + `fleet` are both installed). Perfect fit for an AI builder composing verticals — declare bridges, let them light up (`[decision-needed]` field shape, see [PLUGINS.md](PLUGINS.md) §dependencies).
- **pre/post/end migration phasing** around auto-applied schema — a clean lifecycle model even though Odoo's hand-written SQL inside it is the anti-pattern.
- Anti-patterns: unscoped `_inherit` monkey-patching (spooky action at a distance), one shared registry with no isolation, hand-ordered XML data files.

### Cal.com (`cal.diy/`) — the connector analog

- **Folder-per-app fixed shape** (`packages/app-store/<app>/`: `_metadata.ts`, `config.json`, `api/`, `components/`, `zod.ts`) — the template for fayz connector anatomy.
- **Generic credential record**: `Credential { type, key, appId, userId|teamId, invalid }` — polymorphic, scoped to user or team, flaggable as invalid. Adopt for connector auth ([CONNECTORS.md](CONNECTORS.md) §credentials).
- `extendsFeature` metadata declares *which host surface an app plugs into* — fayz's `hostPluginId` is the same concept.
- Anti-patterns: 10+ committed `*.generated.ts` registries (constant drift/conflicts); install-state derived from env vars *and* DB (two sources of truth).

### Base44 SDK (`javascript-sdk/`) — competitive intel

The reference for "what an AI-builder-native SDK exposes": `createClient({ appId })` with namespaces **entities / auth / integrations / connectors / functions / agents**. Notable: a dynamic entity Proxy (`base44.entities.AnythingTheAIInvented.create()` — AI-invented entities instantly callable), three permission modes on one API (anonymous / user token / `asServiceRole` for backend), and `connectors.getConnection(type)` returning platform-brokered OAuth tokens so app code never handles OAuth. Its flaw: everything is `any`-typed at the boundary — type safety depends on the generator remembering to augment a registry. Fayz's plugin schemas can beat this with derived types ([AI-BUILDER.md](AI-BUILDER.md) §runtime surface).

---

## 5. The twelve transferable rules

Operationalized with enforcement pointers in [BEST-PRACTICES.md](BEST-PRACTICES.md).

| # | Rule | Source lesson |
|---|---|---|
| 1 | Typed manifest or it doesn't exist — every extension point is a declared, schema-validated, versioned contract | WP hooks (§1.2), VS Code `contributes` (§3) |
| 2 | Plugins declare schema, never touch the DB — manifest-declared migrations + RLS in a plugin-owned namespace | Shopify metafields (§2.5), Lovable CVE (§3) |
| 3 | Untrusted logic = declared data in, declarative ops out; the host executes | Shopify Functions (§2.1) |
| 4 | Capability permissions in the manifest, enforced at runtime, shown at install | WP full-privilege model (§1.1) |
| 5 | Real isolation boundaries, not conventions — community code behind a genuine boundary | Figma Realms escape (§3), VS Code extension host (§3) |
| 6 | Calendar-versioned plugin API with overlap windows; deprecation in tooling, delisting for stragglers | Shopify versioning (§2.3), Gutenberg (§1.3) |
| 7 | Review at listing AND forever — automated scan, periodic re-scan, abandonment policy, kill switch | WP abandoned plugins (§1.1), VS Code malware (§3) |
| 8 | Quality tiers tied to distribution, re-audited | Built for Shopify (§2.2) |
| 9 | Test the composition, not just the plugin | Odoo module-interaction bugs (§3) |
| 10 | Guardrail the money paths; free the rest | Shopify checkout kill (§2.1/§2.6) |
| 11 | Design system as contract — third-party feels first-party | Polaris (§2.4) |
| 12 | Governance and exit are architecture — written rules with process, and a real data/code exit path | WP Engine crisis (§1.4), Base44 lock-in (§3) |
