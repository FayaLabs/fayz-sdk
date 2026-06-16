# PLUGIN-ECOSYSTEM — will this scale, or become a Frankenstein?

> An honest stress-test of the plugin concept on an AI builder: does it work, does it scale, how do outsiders publish, and how we avoid a maintenance monster. **2026-06-16.**
> Companion: [PLUGIN-MODEL](PLUGIN-MODEL.md) (the contract), [ARCHITECTURE-MAP](ARCHITECTURE-MAP.md) (the picture), [RELEASE-PLAN](RELEASE-PLAN.md) (the road).

---

## The honest verdict up front

**Your worry is correct, and it's containable.** A plugin ecosystem on an AI builder *will* become a Frankenstein if it's left loose — that's the default outcome, not a tail risk. But the same model, with strict **isolation + contracts + machine-enforced gates**, is exactly how VS Code (50k+ extensions) and Shopify (10k+ apps) scaled without collapsing. The ones that got messy (early WordPress) shared one thing: **weak isolation and a database free-for-all.**

So the real statement isn't "plugins are risky." It's: **the discipline has to be enforced by gates, not by good intentions** — because an AI is generating both the apps and (eventually) the plugins, and an AI will absolutely take the shortcut if a gate doesn't stop it. We already have two of the load-bearing gates. We're missing three. This doc names all of them honestly.

---

## 1. Does the concept even work on an AI builder?

The fear: AI builders generate arbitrary code (Lovable); plugins are curated units. Won't the AI just rewrite/copy plugin code and dissolve the curation? **Only if we let it.** The defense is a hard boundary on *what the AI is allowed to touch:*

```mermaid
flowchart TB
  ai(["🤖 Fayz AI Builder"])
  subgraph CAN["✅ AI writes freely — app-owned"]
    m["app.manifest.json — compose & enable plugins"]
    o["custom pages · components · brand · glue"]
  end
  subgraph REVIEW["⚠️ AI proposes — gate reviews"]
    cfg["config · provider adapters · dependencies"]
  end
  subgraph NEVER["⛔ AI never touches — blocked"]
    pi["plugin internals · SDK engines · other tenants' data"]
  end
  ai --> CAN
  ai -. proposes .-> REVIEW
  ai -. blocked by scope gate .-> NEVER
  class CAN ok
  class REVIEW warn
  class NEVER bad
  classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef warn fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef bad fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
```

**This already exists and is enforced** — `check:fayz-sdk-agent-gates` classifies every file an AI edit touches as *app-owned / review / blocked*, and the run is rejected if it writes a blocked file. The dogfood proofs show the AI refusing to edit `src/plugins/**`. So: the concept works **because the AI composes plugins via the manifest and writes glue — it does not author plugin internals.** That's the difference between "AI builder + curated plugins" and "AI rewrites everything every time."

---

## 2. The two scaling axes (they scale very differently)

```mermaid
flowchart LR
  subgraph A["📈 Scaling APPS — thousands of generated apps"]
    direction TB
    a1["plugins shared BY REFERENCE (version pin)"]
    a2["plugin code is NEVER copied into an app"]
    a3["risk: version skew → channels + semver"]
  end
  subgraph P["🧩 Scaling PLUGINS — community publishes hundreds"]
    direction TB
    p1["each plugin = isolated capability unit"]
    p2["namespaced data + RLS + tenant scope"]
    p3["certified by check:plugin-capability"]
    p4["risk: coupling + DB sprawl → contracts + gates"]
  end
  class A ok
  class P warn
  classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef warn fill:#fef9c3,stroke:#ca8a04,color:#713f12
```

- **Scaling apps is the easy axis** (green). 10,000 apps using `plugin-shop` all point at *one* versioned package. Nothing is copied, so there's no duplication to maintain. The only risk is version skew, solved by version channels (FAY-1183) + semver discipline.
- **Scaling plugins is the hard axis** (amber). This is where Frankenstein lives. 300 community plugins only stay sane if each is an **isolated unit** that can't reach into other plugins, other tenants, or the host — enforced, not requested.

The maintenance-mess fear is really a fear about the **second axis**. The rest of this doc is about containing it.

---

## 3. The #1 Frankenstein risk: the shared database

Every plugin wants tables. 200 plugins in one Supabase is exactly how WordPress got messy — plugins writing wherever they liked. Our defense is **namespace + tenant isolation, by convention today, by gate tomorrow:**

```mermaid
flowchart TB
  subgraph DB["🗄️ One Supabase — many plugins, isolated"]
    direction LR
    t1["tsk_* tables<br/>plugin-tasks"]
    t2["crm_* tables<br/>plugin-crm"]
    t3["shop_* tables<br/>plugin-shop"]
  end
  rls(["🔒 RLS — tenant_id IN user_tenant_ids()"])
  t1 --- rls
  t2 --- rls
  t3 --- rls
  rule["Rule: a plugin only touches its own prefix.<br/>Every row is tenant-scoped. No cross-plugin DB writes."]
  rls --- rule
  class t1,t2,t3 ok
  class rls hinge
  classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef hinge fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
```

The convention is **already in the code** (`tsk_labels`, `shop_products`, `crm_*`), and migrations ship RLS policies keyed on `tenant_id`. What's **missing** is a gate that *enforces* "a plugin's migrations may only create/alter tables under its own prefix, and every table must be tenant-scoped + RLS-protected." Until that gate exists, a sloppy (or AI-written) plugin could still write outside its lane. **That gate is the single most important thing to build before opening the marketplace to outsiders.**

---

## 4. How a developer publishes a plugin (and why it integrates cleanly)

```mermaid
flowchart LR
  s["fayz create plugin"] --> impl["implement the capability contract<br/>entities · migrations · provider · permissions · seed · tests"]
  impl --> g1{"check:plugin-capability"}
  g1 -- fail --> impl
  g1 -- pass --> g2{"security + isolation gate"}
  g2 -- fail --> impl
  g2 -- pass --> cat["marketplace catalog<br/>derived from the manifest"]
  cat --> inst["customer clicks Install<br/>→ manifest ref + provisioning"]
  impl -. depends ONLY on .-> sdk["@fayz-ai/sdk<br/>public API"]
  class g1,g2 hinge
  class sdk ok
  classDef hinge fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
  classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d
```

The integration is "smooth" for one reason: **a community plugin depends only on `@fayz-ai/sdk`'s public API** — never on internal packages, never on the host's guts. That's the stable contract VS Code and Shopify both rely on. The plugin targets a small, versioned surface; the host can refactor everything behind it without breaking the plugin. **Certification = passing the gates**, not human review — that's what makes it scale to hundreds of authors. Two of these gates exist (`check:plugin-capability`, `check:plugin-patterns`); the **security + isolation gate (g2) does not yet** — it's the gate from §3 plus a check that the plugin holds no secrets and calls the broker for provider access.

---

## 5. The anti-Frankenstein control panel (honest status)

Each maintenance-mess risk, the mechanism that contains it, and whether it's actually enforced today. **This is the real answer to "how do we avoid the mess" — and where we're still exposed.**

| Frankenstein risk | The guardrail | Status |
|---|---|---|
| 100 plugins, 100 visual dialects | `check:plugin-patterns` — shared UI primitives | ✅ **enforced** |
| Plugins that are demos, not real capabilities | `check:plugin-capability` — data/perm/migration contract | 🟡 **landed, 1/18 enforced** (ratcheting) |
| AI corrupts a plugin / copies its code into apps | `check:fayz-sdk-agent-gates` — app-owned/blocked scope | ✅ **enforced** |
| Database sprawl (plugins writing anywhere) | table-prefix + tenant + RLS, **gate-enforced** | 🔴 **convention only — no gate** |
| One tenant reads another's data | RLS keyed on `tenant_id` | 🟡 **present where migrations exist, not universally checked** |
| Version skew across thousands of apps | version channels + semver + published-build CI | 🔴 **drift exists; CI not enforcing published build** |
| Plugins tangled into each other | manifest dependencies + topo-sort + cycle detection | 🟡 **runtime detects cycles; cross-plugin *data* coupling uncontracted** |
| A broken plugin takes down the whole app | blast-radius isolation (plugin fails → disables itself) | 🔴 **not yet — a plugin throw can break the shell** |
| Plugin A reaches into plugin B at runtime | communicate via events, not imports | 🟡 **events exist in the manifest; discipline not enforced** |
| Community plugin quality / safety | certification = the gates above, automated | 🔴 **not built (community submission absent)** |

**Reading this honestly:** the *app-facing* discipline is strong (UI, scope, capability contract). The *ecosystem-facing* discipline — the stuff you only need when **outsiders** publish — is mostly 🔴/🟡. That's fine, because the release plan doesn't open the marketplace to customers until **step ④**, and these red rows are precisely ④'s entry gate. The danger would be opening ④ early. The board's blockers prevent that.

---

## 6. The precedent — am I considering the bigger picture?

You asked if you're being pessimistic or if I'm missing something. Here's the bigger picture, from ecosystems that already ran this experiment at scale:

```mermaid
flowchart TB
  subgraph won["✅ Scaled cleanly — VS Code · Shopify"]
    direction TB
    w1["stable, small public host API"]
    w2["plugins isolated / sandboxed"]
    w3["capability manifest per plugin"]
    w4["automated certification + semver"]
  end
  subgraph messy["⚠️ Got Frankenstein-y — early WordPress"]
    direction TB
    z1["plugins touch DB & globals freely"]
    z2["no isolation — one breaks the site"]
    z3["weak versioning / compat policy"]
  end
  class won ok
  class messy bad
  classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef bad fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
```

The dividing line is **isolation + a stable contract + enforced certification.** Fayz's design is on the winning side *by intent* — manifest-declared capabilities, one public SDK surface, namespaced data, the gates. The risk is purely **execution discipline**: every guardrail that's a 🔴 in §5 is a place where, under deadline pressure and AI shortcuts, we could slide toward the WordPress column. The way you stay in the VS Code column is boring and non-negotiable: **a plugin can't ship to customers until it passes the gates, and the gates are code, not vibes.**

---

## What must be true before the plugin center opens to customers (step ④)

These are the 🔴 rows, turned into the non-negotiables. (Not auto-creating tickets — flagging them so *you* decide when they enter the queue.)

1. **Isolation gate** — a plugin's migrations may only touch its own table prefix; every table is tenant-scoped + RLS-protected; the plugin holds no secrets. *(extends `check:plugin-capability`)*
2. **Blast-radius isolation** — a plugin that throws disables itself and surfaces an error; it never crashes the host shell or other plugins.
3. **Published-build CI** — a generated app builds against the *published* `@fayz-ai/sdk`, so version skew is caught before customers feel it. *(this is also milestone ①'s gate)*
4. **Cross-plugin contract** — plugins interact through declared events, never by importing each other; a gate flags direct cross-plugin imports.
5. **Certification pipeline** — community submission runs all gates + a security review automatically; passing = listed.

Do these five and the ecosystem scales like VS Code's. Skip them and your instinct is right — it becomes a monster. The architecture is sound; the discipline is the product.
