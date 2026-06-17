# @fayz-ai/plugin-forms

> Templates, documents, and signatures — the paperwork layer for any vertical.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-forms.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-forms)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-forms.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Every real business runs on forms it never wanted to build: anamnesis sheets, evolution notes, consent contracts, intake docs. plugin-forms kills that busywork. Define a template once, attach a filled document to a person, and the data lives in your tenant — not in a PDF nobody can query.

It snaps into a `defineSaas` app as the document engine. A clinic fills health anamnesis, a salon collects consent forms, a studio signs contracts — same plugin, same `frm_*` tables, different templates. Documents surface right inside the person record via a detail-tab widget, and the AI assistant can list templates and a client's documents on demand.

## What's inside
- **Template + document model** backed by Supabase (`frm_*` tables) with a mock provider fallback via `createSafeDataProvider`
- **Form categories registry** (`frm_categories`, tenant-scoped) seeded with Anamnese, Evolução, Laudo, Contrato, Geral
- **Person detail widget** — a `person.detail.documents` zone tab that lists and attaches documents to a contact
- **Settings tab** for managing templates, documents, and categories
- **Document-type provider API** — `registerDocumentTypeProvider` lets other plugins contribute selectable document/file types
- **AI tools** — `listFormTemplates` and `listDocuments` (read-only, permission-gated)
- **Pluggable data layer** — pass your own `dataProvider`, or let it auto-resolve Supabase → mock

## Install
```bash
npm install @fayz-ai/plugin-forms
```
Peer deps: `react`, `react-dom`. Runtime deps: `@fayz-ai/core`, `@fayz-ai/ui`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createCustomFormsPlugin } from '@fayz-ai/plugin-forms'

export const app = defineSaas({
  // ...
  plugins: [
    createCustomFormsPlugin({
      labels: { pageTitle: 'Documents' },
      // dataProvider: myProvider,  // optional — defaults to Supabase → mock
    }),
  ],
})
```

## Part of the Fayz SDK
One of the composable plugins that turn `@fayz-ai/saas` into a real, vertical-specific SaaS — this one owns documents and signatures.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-forms) for current gaps, missing features, and good first issues.
