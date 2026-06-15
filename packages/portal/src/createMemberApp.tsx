import React from 'react'
import { MemberConfigProvider, resolveConfig, useMemberConfig } from './config'
import type { MemberConfig } from './config'
import { initMemberAuth, resolveAuthAdapter } from './auth'
import { useHashPath, matchPath } from './router'
import { MemberHeader } from './components/MemberHeader'
import { MyCoursesPage } from './pages/MyCoursesPage'
import { CoursePlayerPage } from './pages/CoursePlayerPage'
import { AccountPage } from './pages/AccountPage'

function RouteSwitch() {
  const path = useHashPath()

  const lesson = matchPath('/course/:slug/lesson/:id', path)
  if (lesson?.slug) return <CoursePlayerPage slug={lesson.slug} lessonId={lesson.id} />

  const course = matchPath('/course/:slug', path)
  if (course?.slug) return <CoursePlayerPage slug={course.slug} />

  if (matchPath('/account', path)) return <AccountPage />

  return <MyCoursesPage />
}

/** Side-effect runtime init shared by the factory and the manifest scaffold:
 *  wires learner auth (+ optional Supabase client). Idempotent. */
export function initMemberRuntime(config: MemberConfig): void {
  // The courses data provider is owned by the host app (mock or Supabase). The
  // portal only wires learner auth here; a Supabase-backed app sets the global
  // client + provider before mounting.
  initMemberAuth(
    resolveAuthAdapter(config.auth?.adapter, { url: config.supabaseUrl, anonKey: config.supabaseAnonKey }),
    { autoEnroll: config.autoEnroll ?? true },
  )
}

/** Inner portal UI — reads everything from config context, so it is shared by
 *  createMemberApp and the manifest-driven MemberScaffold. */
export function MemberShell() {
  const config = useMemberConfig()
  return (
    <div className="min-h-screen bg-background text-foreground" data-portal={config.name}>
      {config.accent && (
        <style>{`:root{--primary:${config.accent};}`}</style>
      )}
      <MemberHeader />
      <RouteSwitch />
    </div>
  )
}

/** Declarative member-portal factory — sugar over the manifest path (equivalent
 *  to renderApp(defineMember(config))). */
export function createMemberApp(config: MemberConfig): React.ComponentType {
  const resolved = resolveConfig(config)
  initMemberRuntime(config)
  function MemberApp() {
    return (
      <MemberConfigProvider value={resolved}>
        <MemberShell />
      </MemberConfigProvider>
    )
  }
  MemberApp.displayName = 'MemberApp'
  return MemberApp
}
