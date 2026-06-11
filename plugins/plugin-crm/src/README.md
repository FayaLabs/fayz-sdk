# Sales & CRM Plugin

Lead management, sales pipeline, deal tracking, quotes, and activity logging for any SaaS vertical.

## Quick Start

```typescript
import { createCrmPlugin } from '@fayz/saas-core/plugins/crm'

plugins: [
  createCrmPlugin({
    currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  }),
]
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modules.pipeline` | boolean | true | Visual kanban deal board |
| `modules.quotes` | boolean | true | Quote management |
| `modules.activities` | boolean | true | Activity logging |
| `modules.contacts` | boolean | true | Contact segmentation |
| `currency` | object | BRL/pt-BR | Currency formatting |
| `dealStages` | array | 7 default stages | Custom pipeline stages |
| `itemTypes` | array | service, product, other | Quote line item types |
| `leadSources` | array | — | Custom lead sources |
| `dataProvider` | CrmDataProvider | mock | Custom data provider |
| `navPosition` | number | 5 | Navigation order |

## Architecture

```
src/plugins/crm/
  index.ts              # createCrmPlugin() factory
  types.ts              # Pipeline, Lead, Deal, Activity, Quote types
  registries.ts         # Lead Sources, Tags, Activity Types
  store.ts              # Zustand UI state
  CrmContext.tsx         # React contexts + hooks
  CrmPage.tsx            # Main page with ModulePage layout
  data/                 # Provider interface + mock
  views/                # Dashboard, Pipeline, Leads, Quotes, Activities, Contacts
  components/           # Settings, GeneralSettings, Onboarding
  migrations/           # SQL files
```

## Type System

| Entity | Purpose |
|--------|---------|
| `Pipeline` | Named pipeline with stages |
| `PipelineStage` | Stage with order, color, probability, won/lost flags |
| `Lead` | Contact with source, status, value, tags |
| `Deal` | Opportunity in pipeline with stage, value, probability |
| `Activity` | Interaction log: call, email, meeting, note, task |
| `Quote` | Proposal with line items, status lifecycle |
| `Tag` | Colored label for organizing leads/deals |
| `LeadSource` | Where leads come from |

### Pipeline Stages (default)

New → Contacted → Qualified → Proposal → Negotiation → Won / Lost

### Lead Status Flow

new → contacted → qualified → converted (to deal) / unqualified / lost

### Quote Lifecycle

draft → sent → approved / rejected / expired

## Settings

Plugin settings have two sections:

**General** — Module toggles, lead management config, deal behavior
**Registries** — Lead Sources (seeded), Tags (editable), Activity Types (read-only)

## Views

| View | Route | Description |
|------|-------|-------------|
| Dashboard | `/sales` | KPIs, funnel chart, won deals |
| Pipeline | `/sales/pipeline` | Kanban board by stage |
| Lead List | `/sales/leads/list` | Filterable by status/source |
| Lead Form | `/sales/leads/new` | Capture new lead |
| Quotes | `/sales/quotes/list` | Quote management |
| Activities | `/sales/activities` | Activity log |
| Contacts | `/sales/contacts/*` | Active/Inactive/VIP segments |
| Settings | `/sales/settings/*` | General + Registries |

## Database Migrations

1. `001_crm_base.sql` — pipelines, pipeline_stages, lead_sources, crm_tags, leads, deals
2. `002_quotes.sql` — crm_quotes, crm_quote_items
3. `003_activities.sql` — crm_activity_types, crm_activities
