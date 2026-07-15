# @fayz-ai/plugin-tasks

> A task list that lives in your topbar, in every app you compose.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-tasks.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-tasks)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-tasks.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — capability-complete (Supabase/mock data provider, bundled migration, end-to-end tests). Pre-1.0: APIs may change before 1.0.

Work happens between the records. A salon owner needs to "call the supplier," a clinic admin needs to "follow up on lab results" — small things that never fit neatly into a booking or an invoice. `plugin-tasks` gives every Fayz app a lightweight, always-available task list: a topbar button that opens a drawer for quick-add, statuses, priorities, due dates, labels, and assignees.

It's deliberately small and zero-config. Drop it in and it owns its own tables (via a bundled migration), picks Supabase or an in-memory mock automatically, and exposes its summary to the AI assistant — so "what's overdue?" just works. No page to wire, no nav slot to claim; tasks ride along with whatever vertical you compose.

## What's inside
- **Topbar task drawer** — a widget mounted at `shell.topbar.end` for quick-add and review, available on every page.
- **Task model** — title, description, status (todo / in progress / done / cancelled), priority (low / medium / high / urgent), due date, labels, assignee, and subtasks (parent/child).
- **AI tool** — `getTasksSummary` reports totals, overdue, due-today, and breakdowns by status and priority.
- **Bundled migration** — creates `tsk_tasks` and `tsk_labels` with tenant-scoped RLS, so it's self-installing.
- **Settings tab** + i18n, with a Supabase-or-mock data provider chosen automatically.
- Configurable labels and a default priority for new tasks.

## Install
```bash
npm install @fayz-ai/plugin-tasks
```
Peer deps: `react`, `react-dom`. Runtime deps include `@fayz-ai/core`, `@fayz-ai/ui`, and `@fayz-ai/saas`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createTasksPlugin } from '@fayz-ai/plugin-tasks'

export const app = defineSaas({
  // ...
  plugins: [
    createTasksPlugin({
      defaultPriority: 'medium',
      labels: { drawerTitle: 'To-dos', quickAddPlaceholder: 'Add a to-do...' },
    }),
  ],
})
```

## Part of the Fayz SDK
`plugin-tasks` is the lightweight companion plugin: no navigation of its own, it simply adds a task surface to any app built with `@fayz-ai/saas`. It complements heavier plugins like `@fayz-ai/plugin-agenda` and `@fayz-ai/plugin-financial` by capturing the loose work around them.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-tasks) for current gaps, missing features, and good first issues.
