# RELEASE-PLAN — Shipping fayz-sdk into the live Fayz, in steps

> How we deploy the SDK convention onto the **current** version of Fayz without breaking it, in four ordered releases. **2026-06-16.**
> Companion: [STATE.md](STATE.md), [PLUGIN-MODEL.md](PLUGIN-MODEL.md), [ROADMAP.md](ROADMAP.md).
> Linear: project `fayz-sdk`, milestones **1→4** mirror the four steps below.

---

## The core risk we are managing

The moment a generated app deploys with a convention, **that convention is hard to change** — every deployed app inherits it. So the release order is deliberately **inside-out and proof-first**:

> Prove the convention in the SDK → prove it on hand-built `fayz-app` apps → only then teach the generator to emit it → only then open it to customers.

We never let the editor bake an unproven contract into apps that real users have deployed. This is why **FAY-1188 (editor adopts convention) is blocked by the dogfood proofs**, not the other way around.

---

## Two parallel lanes (so two agents never collide)

Work is split into two labels so Codex and Claude Code can eat tickets in parallel without touching each other's files. **Both lanes read the same architecture docs** (`docs/discovery/{STATE,PLUGIN-MODEL,ROADMAP,RELEASE-PLAN}.md`), authored and maintained by Claude Code.

| Lane | Label | Owns | Never touches |
|---|---|---|---|
| **Claude Code** | `agent:claude-code` | **All frontend/UI** (apps/web Panel, dogfood apps), the `@fayz-ai` SDK packages + plugins, design system, the architecture docs | server/broker internals, payment webhooks, container infra |
| **Codex** | `agent:codex` | Backend/platform/infra: Fayz `apps/api`, scaffold/generator, shop broker + payment webhooks, migration execution, version channels, preview containers | any frontend; the architecture docs (reads, doesn't author) |

**Rule (non-negotiable): every frontend ticket goes to Claude Code.** When a ticket spans both (e.g. payments = server webhook + storefront UI wiring), it stays in the backend lane and the small UI wiring is split into a Claude Code sub-task. The agent-scope gates (`check:fayz-sdk-agent-gates`) already enforce file-level boundaries, so a mislabeled ticket fails the gate rather than corrupting the other lane.

**Collision avoidance:** the two lanes own disjoint directories (Codex = `fayz/apps/api`, scaffold, brokers; Claude Code = `fayz/apps/web`, `fayz-sdk/packages`, `fayz-sdk/plugins`, `fayz-app/*`). The capability contract is the shared interface between them — Codex implements the migration runner/broker behind it, Claude Code implements the SDK/plugin/UI in front of it.

---

## The four release steps

Each step lists: **the bar** (what "done" means), **current state**, **the work** (Linear tickets), and the **gate** that proves it before we move on. Steps are a dependency chain — don't open step N+1's customer-facing surface until step N's gate is green.

### ① Every project ships @fayz-ai/sdk  · milestone 1

**The bar.** A newly generated Fayz project builds and runs against the **published** `@fayz-ai/sdk` (not source aliases), pinned to a version channel, with the manifest/registry/capability convention in place — so "ships the SDK" means ships *working capabilities*, not just UI.

**Current state.** `@fayz-ai/sdk` is published (0.1.5) and the only public package (FAY-1181/1184 done). The scaffold uses `renderApp(manifest)`. BUT: dogfood apps run on Vite **source aliases**, not the published package; version pins drift (apps pin `^0.1.3`, SDK builds `0.1.5`/`0.1.0`); the plugin capability contract is only just being made executable.

**The work.** `agent:claude-code` → FAY-1203/1204/1206 (capability contract + gate + reference — gate **landed this session**), FAY-1196/1191/1192 (customization foundation), FAY-1178 (Panel renders from manifest). `agent:codex` → FAY-1183 (version channel), FAY-1199 (preview-container SDK paths), FAY-1205 (migration runner).

**Gate.** A clean generated project **builds against the published package in CI** (not aliases); `check:public-surface` + `check:plugin-capability` green; version drift reconciled.

### ② Teach the Fayz agent to handle the packages  · milestone 2

**The bar.** The Fayz AI agent can (a) **install/enable a plugin** (marketplace `setPlugin` → manifest), (b) **use SDK capabilities** via queryable capability metadata (not a copied instruction manual), and (c) stay inside the **app-owned edit boundary** — all enforced by the agent-scope gates.

**Current state.** Strong foundation already exists: `check:fayz-sdk-agent-gates`, app-owned/review/blocked file classification, MCP `send_message` scope preflight, the `30-sdk-app-operating-contract.md` edit boundaries. Missing: the generator emitting the *proven* convention, and a machine-readable capability registry the agent can reason over.

**The work.** `agent:codex` → FAY-1188 (editor adopts convention — **blocked by ① + dogfood**), FAY-1194 (AI-native customization decision loop). `agent:claude-code` → FAY-1201 (Panel renders launch/admin controls, not duplicated product nav). Capability metadata surface comes from FAY-1204.

**Gate.** A scoped agent run **enables a capability + edits an app-owned surface end-to-end**, no SDK/internal edits, under the existing block-mode gate. **Do not rewrite Boris-owned AI prompts** without his review — teach via metadata + gates, not prompt surgery.

### ③ Deploy the apps we built  · milestone 3

**The bar.** The dogfood apps (Beauty, The Chef/Resto, the storefronts, Marketplace) deploy as **real Fayz projects on published packages**, with plugins provisioning real data and commerce able to take a **real payment**.

**Current state.** Apps build and pass the dogfood contract gate (4/4 green), but on source aliases; commerce can't take money (payment unimplemented); published-app `/admin` can fall through to Fayz Admin (FAY-1162, urgent).

**The work.** `agent:claude-code` → FAY-1185/1186/1187 (Beauty + Chef dogfood proofs), FAY-1190/1193/1195 (commerce primitives + Chef workflow). `agent:codex` → FAY-1197/1202/1200 (server-owned shop broker + manifest seeding), FAY-1207 (**payments: Pix/MercadoPago**), FAY-1182 (trust boundary), FAY-1162 (published `/admin` isolation — urgent).

**Gate.** ≥2 verticals **live on `*.live.ymaia.com` against published SDK**; one store takes a **real Pix payment**; `/admin` isolation fixed.

### ④ Release the plugin center to customers  · milestone 4

**The bar.** The marketplace opens to **external customers**: install provisions a **governed capability** (data + permissions + migrations + seed), the trust boundary holds (server-side creds, deny-by-default permissions), and certification = **passes `check:plugin-capability`**.

**Current state.** Marketplace UI + install→manifest flow work; community submission is empty-state only; capability provisioning + deny-by-default permissions are the prerequisites (built in ①/③).

**The work.** Everything above must be green first. Then: community submission backend, certification = the capability gate, per-tenant isolation proof. `agent:claude-code` → FAY-1189 (public-boundary decision) + marketplace UI; `agent:codex` → submission/cert backend, tenant isolation tests. (New tickets created here once ③ lands — don't pre-spawn them.)

**Gate.** A **non-Fayz tenant installs a plugin and gets a real, isolated, governed capability**; community submission path defined; security review of the multi-tenant boundary passed.

---

## Sequencing at a glance

```
①  SDK ships everywhere  ──►  ③  Deploy our apps  ──►  ④  Plugin center for customers
        │                          ▲                          ▲
        └──►  ②  Agent handles packages  ──────────────────────┘
   (① is the foundation for both ② and ③; ④ needs ②+③ green)
```

- **① unblocks everything.** It's where the capability contract + published-package path land.
- **② and ③ run in parallel** once ① is solid (different lanes, different surfaces).
- **④ is gated on both** — never open the marketplace to customers until apps deploy cleanly and the agent handles packages safely.

**Definition of "released":** a customer prompts Fayz → gets an app that ships `@fayz-ai/sdk` (①), the agent customizes it safely (②), it deploys and transacts (③), and they can install a governed plugin from the center (④). That's the whole loop, locked.
