import * as React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { registerTranslations, registerPluginFactory } from '@fayz-ai/core'
import {
  getCoursesProviderOptional,
  setCoursesProvider,
  createMockCoursesProvider,
} from '@fayz-ai/courses'
import { coursesLocales } from './locales'
import { CoursesListPage } from './pages/CoursesListPage'
import { CourseEditorPage } from './pages/CourseEditorPage'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-courses — admin management for the courses domain. Mirrors
// @fayz-ai/plugin-shop: a navigation entry + routes pointing at custom admin pages
// built directly on @fayz-ai/courses. Native from day one (no saas-core imports).
// ---------------------------------------------------------------------------

export interface CoursesPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
}

export function createCoursesPlugin(options?: CoursesPluginOptions): PluginManifest {
  // Register locales globally so keys resolve even before the I18nProvider mounts.
  registerTranslations(coursesLocales)

  // Defensive default: if the host app didn't set a provider, fall back to a
  // mock so the admin still renders. Apps that share admin↔member set their own.
  if (!getCoursesProviderOptional()) {
    setCoursesProvider(createMockCoursesProvider())
  }

  return {
    id: 'courses',
    name: options?.navLabel ?? 'Courses',
    icon: 'BookOpen',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 1,
        label: options?.navLabel ?? 'Courses',
        route: '/courses',
        icon: 'BookOpen',
      },
    ],
    routes: [
      { path: '/courses', component: CoursesListPage as React.ComponentType<unknown> },
      { path: '/courses/:id', component: CourseEditorPage as React.ComponentType<unknown> },
    ],
    widgets: [],
    locales: coursesLocales,
  }
}

// Self-register the factory so renderApp(manifest) with a PluginRef { id:
// 'courses' } resolves without a separate plugins.generated.ts entry (apps may
// still register explicitly; registration is idempotent on id).
registerPluginFactory('courses', createCoursesPlugin as (config?: Record<string, unknown>) => PluginManifest)

export { coursesLocales } from './locales'
