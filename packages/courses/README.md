# @fayz-ai/courses

> The education domain for Fayz — courses, modules, lessons, enrollments, progress. The counterpart of `@fayz-ai/shop`.

[![npm](https://img.shields.io/npm/v/@fayz-ai/courses.svg)](https://www.npmjs.com/package/@fayz-ai/courses)
[![license](https://img.shields.io/npm/l/@fayz-ai/courses.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — published to npm and used across Fayz dogfood apps. Pre-1.0: minor APIs may change before 1.0.

`@fayz-ai/courses` is the headless learning engine: a `CoursesProvider` contract plus the domain types and hooks for courses, modules, lessons, enrollments, and progress tracking. It owns *what learning means* so course-admin and member surfaces only have to render it — the education-side mirror of how `@fayz-ai/shop` powers commerce.

Provider-first: build on `createMockCoursesProvider`, then swap in your own `CoursesProvider` for real data without touching the UI. A catalog seed builder gets a demo running in minutes.

## What's inside
- **`CoursesProvider` contract** — the one interface every backend implements
- **Mock provider** — `createMockCoursesProvider` + `MockCoursesSeed` for demos/offline
- **Runtime** — `setCoursesProvider` / `getCoursesProvider` wiring
- **Catalog seed** — `buildCourseCatalog`, `DEFAULT_COURSE_CATALOG`
- **Hooks** — `useMyCourses`, `useCourse`, `useCourseProgress`

## Install
```bash
npm install @fayz-ai/courses
```
Peer deps: `@fayz-ai/core` (+ react, react-dom).

## Usage
```ts
import { setCoursesProvider, createMockCoursesProvider, buildCourseCatalog } from '@fayz-ai/courses'

setCoursesProvider(createMockCoursesProvider({ catalog: buildCourseCatalog(/* ... */) }))
```

## Part of the Fayz SDK
The learning engine behind `@fayz-ai/plugin-courses` and the course-admin / course-members apps.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md).
