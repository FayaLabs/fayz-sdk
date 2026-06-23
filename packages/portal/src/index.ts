// @fayz-ai/portal — the authenticated member/learner surface (counterpart of
// @fayz-ai/shop). Importing this package registers the 'member' scaffold.
export type { MemberConfig, ResolvedMemberConfig } from './config'
export { MemberConfigProvider, useMemberConfig, resolveConfig } from './config'

export { createMemberApp, initMemberRuntime, MemberShell } from './createMemberApp'
export { defineMember, MemberScaffold } from './scaffold'

export { useMemberSession } from './session'
export type { MemberSessionState } from './session'

export {
  initMemberAuth,
  establishMemberSession,
  signUpMember,
  signOutMember,
  customerIdForEmail,
  resolveAuthAdapter,
} from './auth'

export { useHashPath, matchPath, navigateTo, Link } from './router'

export { MyCoursesPage } from './pages/MyCoursesPage'
export { CoursePlayerPage } from './pages/CoursePlayerPage'
export { AccountPage } from './pages/AccountPage'
export { MemberHeader } from './components/MemberHeader'

// ---------------------------------------------------------------------------
// Front-door re-exports: member apps depend on @fayz-ai/portal alone.
// Runtime (renderApp/defineApp) from @fayz-ai/core; the courses provider API
// from @fayz-ai/courses, so plugins.generated.ts wires providers through the
// portal front door. Mirrors the @fayz-ai/saas front door.
// ---------------------------------------------------------------------------
export { renderApp, defineApp } from '@fayz-ai/core'
export {
  setCoursesProvider,
  getCoursesProvider,
  getCoursesProviderOptional,
  MockCoursesProvider,
  createMockCoursesProvider,
  useMyCourses,
  useCourse,
  useCourseProgress,
} from '@fayz-ai/courses'
export type { CoursesProvider, MockCoursesSeed } from '@fayz-ai/courses'
