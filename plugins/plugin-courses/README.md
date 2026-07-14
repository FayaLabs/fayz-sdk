# @fayz-ai/plugin-courses

> **Status: experimental (incubating).** Not capability-complete — missing some or all of the capability bar (data-provider contract w/ supabase+mock pair, entity registries, settings, migrations; see `docs/PLUGIN-PATTERNS.md`). Fine to explore in dogfoods; NOT ready for fresh installs or generated apps, and its API may change without notice.

> Drop a course-builder admin into any Fayz SaaS — courses, modules, lessons, enrollments.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-courses.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-courses)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-courses.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Every vertical eventually wants to sell knowledge. A salon teaches a masterclass, a clinic runs patient education, a gym ships training programs. Bolting an LMS onto each is wasted work. This plugin makes "courses" a capability you snap on: a navigation entry plus admin pages for authoring courses, organizing modules and lessons, and tracking enrollments and progress.

The admin pages are built directly on the `@fayz-ai/courses` engine through a swappable **provider** — ship the bundled mock to demo instantly, or wire your own (Supabase, REST) so the same UI runs on your data. One engine, many surfaces: the admin here, and a member-facing surface elsewhere, sharing the same provider and types. That's the Fayz way — compose a real SaaS from plugins instead of rebuilding the LMS for every app.

## What's inside
- Navigation entry + routes: `/courses` (list) and `/courses/:id` (editor)
- Course list with create-and-open flow and draft / published / archived status
- Course editor with **Details** and **Curriculum** tabs — title, subtitle, description, price, status; modules and lessons
- A provider contract (`CoursesProvider`) covering courses, modules, lessons, enrollments, and progress
- A bundled mock provider so the admin renders out of the box (`createMockCoursesProvider`)
- Self-registers as the `courses` plugin factory; full i18n via bundled locales

## Install
```bash
npm install @fayz-ai/plugin-courses
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/courses` (+ `react`, `react-dom`).

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createCoursesPlugin } from '@fayz-ai/plugin-courses'

export const app = defineSaas({
  // ...
  plugins: [
    createCoursesPlugin({
      navLabel: 'Academy',
      navSection: 'main',
      navPosition: 1,
    }),
  ],
})
```
To run on real data, set a provider before render via `setCoursesProvider(...)` from `@fayz-ai/courses`; if none is set, the plugin falls back to the bundled mock so the admin still renders.

## Part of the Fayz SDK
The admin surface for the `@fayz-ai/courses` engine — one of the verticals you compose into a Fayz app.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-courses) for current gaps, missing features, and good first issues.
