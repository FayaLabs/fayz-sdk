# @fayz-ai/portal

> The authenticated member/learner portal scaffold — a "my courses" + player surface for your students.

[![npm](https://img.shields.io/npm/v/@fayz-ai/portal.svg)](https://www.npmjs.com/package/@fayz-ai/portal)
[![license](https://img.shields.io/npm/l/@fayz-ai/portal.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — published to npm and used across Fayz dogfood apps. Pre-1.0: minor APIs may change before 1.0.

Every course or membership product needs a second front door: not the admin app the creator uses, but the logged-in space their members live in. `@fayz-ai/portal` is that surface — an opinionated, auth-gated member shell that renders "my courses," a lesson player, and an account page on top of `@fayz-ai/courses` and `@fayz-ai/auth`. Compose it once and your learners get a real portal instead of a hand-wired one.

## What's inside
- **Member app runtime** — `createMemberApp`, `initMemberRuntime`, and the `MemberShell` layout (header + routed content)
- **Scaffold** — `defineMember` / `MemberScaffold` to declare the portal as data
- **Pages** — `MyCoursesPage`, `CoursePlayerPage`, `AccountPage`, and a `MemberHeader`
- **Session + config** — `useMemberSession`, `MemberConfigProvider` / `useMemberConfig`, and a hash router (`useHashPath`, `Link`, `navigateTo`)

## Install
```bash
npm install @fayz-ai/portal
```
Peer deps: `react`, `react-dom` (^18 or ^19). Runtime deps include `@fayz-ai/core`, `@fayz-ai/auth`, and `@fayz-ai/courses`.

## Usage
```tsx
import { createMemberApp } from '@fayz-ai/portal'

export const memberApp = createMemberApp({
  // auth + courses config for the logged-in learner surface
})
```

## Part of the Fayz SDK
The learner-facing half of the courses stack. Pairs with `@fayz-ai/courses` (the course model + admin) and `@fayz-ai/auth` (who's logged in).
