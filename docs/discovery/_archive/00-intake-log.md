# 00 — Intake Log

Raw and summarized inputs for the Fayz SDK discovery. Keep this file chronological. Do not over-polish; preserve the user's intent and language where useful.

---

## 2026-06-12 — Initial category framing from Vini + AI ERP discussion

### Source

Telegram thread: Fayz Mission Control / product topic.

### User intent

Vini wants Fayz to move beyond a generic AI app builder toward a new category inspired by SAP/Odoo/platform ecosystems:

> Build a new foundation of SAP with customizable software, plugin open source ecosystem, and a community of builders.

### Market reference

Article fetched: `https://www.top10erp.org/blog/ai-in-erp`

Key market signals extracted:

- ERP vendors are adding AI assistants, copilots, predictive analytics, process automation, anomaly detection, document AI, and agent-like digital workers.
- By 2026, “has AI” is not differentiation; usefulness, specialization, governance, and integration depth matter.
- Incumbents — SAP, Oracle, Microsoft Dynamics, Infor, Epicor, Acumatica — frame the category as existing ERP plus AI features.
- The more interesting opening is AI-native ERP: business systems designed around structured data, workflows, plugins, and agents from the start.

### Strategic reframing

Do not position Fayz as only “AI in ERP.” Position as:

> AI-native customizable ERP foundation.

Or:

> A programmable business operating system where companies and builders compose business software through modules, plugins, workflows, and agents.

### Architecture direction from discussion

Three layers:

1. **Builder layer** — AI/custom builders generate and customize apps, workflows, screens, automations, and plugins.
2. **ERP foundation layer** — entities, permissions, audit logs, integrations, workflows, reporting, and manifest/data model.
3. **Agent operating layer** — AI workers monitor, decide, execute, explain, and escalate under governance.

Most AI app builders only have layer 1. SAP has layer 2 but is weak/slow on layer 1 and not AI-native on layer 3. Fayz should connect all three, starting small.

### SDK implication

The SDK should start as a **contract**, not a full runtime:

- types
- builders
- validation
- examples
- tests

No marketplace, full installer, workflow engine, or AI agent executor in v1.

---

## 2026-06-12 — Vini asks to use `~/dev/fayz-sdk` as discovery/planning workspace

### User instruction

Vini will paste a massive prompt in blocks. First task is to organize all inputs into a clear product discovery format using good product methodology practices, then start working through the phases.

### Operating decision

Use `~/dev/fayz-sdk/docs/discovery/` as the planning workspace.

Initial docs created:

- `README.md`
- `00-intake-log.md`
- `01-product-brief.md`
- `02-architecture-principles.md`
- `03-concept-map.md`
- `04-phase-plan.md`
- `05-open-questions.md`

### Repo caution

The repo already has substantial uncommitted work. Do not overwrite existing files casually. Discovery docs are additive and isolated under `docs/discovery/`.

---

## 2026-06-12 — Weekend autonomous single-branch mission / Base44 SDK reference

### Source

Telegram reply from Vini. The visible quoted block is partial, but contains enough to establish the first discovery input.

### Raw visible input

> temos uma missao esse final de semana bem extensa entao vamos nos preparar pra um trabalho autonomo extensivo single branch;
>
> Estamos desenvolvendo o Fayz, um AI Builder pra competir com lovable/base44. descobri esse repo do base44 `base44/javascript-sdk` (`~/dev/open-source`) que eu usei pra inspiracao. O que queremos fazer a mais eh um construtor com um sdk e plugins da comunidade. Plugins pra SMB ERPs / inspirado em Notion with pages and each page hav...

### Extracted intent

Vini wants to prepare for an extensive autonomous weekend workstream on a **single branch**. The strategic benchmark is Base44/Lovable, but Fayz should go beyond them by combining:

- AI builder;
- SDK foundation;
- community plugin ecosystem;
- SMB ERP plugins;
- Notion-like page model;
- modular/customizable business software.

### Discovery implication

We should inspect/use the Base44 JavaScript SDK reference in `~/dev/open-source` before finalizing the Fayz SDK plan. The comparison should separate:

- what Base44 SDK already solves;
- what Fayz should match;
- what Fayz should deliberately exceed;
- what is irrelevant for our ERP/plugin/community thesis.

### Operating implication

Because this is intended as an autonomous single-branch mission, the final plan should be organized as a weekend execution brief with:

- mission outcome;
- scope/non-scope;
- architecture decisions;
- phase order;
- task queue;
- verification checkpoints;
- rollback/stopping criteria.
