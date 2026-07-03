import * as React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { registerTranslations, registerPluginFactory } from '@fayz-ai/core'
import {
  getCoursesProviderOptional,
  setCoursesProvider,
  createMockCoursesProvider,
  setCoursesTenantResolver,
} from '@fayz-ai/courses'
import { useOrganizationStore } from '@fayz-ai/saas'
import { coursesLocales } from './locales'
import { CoursesListPage } from './pages/CoursesListPage'
import { CourseEditorPage } from './pages/CourseEditorPage'
import { SalesPage } from './pages/SalesPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { FinancialPage } from './pages/FinancialPage'
import { ReportsPage } from './pages/ReportsPage'
import { MembersAreaPage } from './pages/MembersAreaPage'
import { CoursesSettingsTab } from './settings/CoursesSettings'
import { createCoursesDashboardWidgets } from './dashboardWidgets'
import { createStripeConnector } from './connectors/stripe'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-courses — admin management for the courses domain. This is a
// PLUGIN, not an app: it only contributes nav + routes + settings + dashboard
// widgets to the @fayz-ai/saas admin scaffold. Login, auth, permissions, the
// sidebar/AppShell chrome and layout all come from @fayz-ai/saas — the plugin
// never rebuilds them. Its screens render inside the saas AdminShell and use
// @fayz-ai/ui primitives.
// ---------------------------------------------------------------------------

export interface CoursesPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
}

const asComp = (c: unknown) => c as React.ComponentType<unknown>
const read = (feature: string) => ({ feature, action: 'read' as const })

export function createCoursesPlugin(options?: CoursesPluginOptions): PluginManifest {
  // Register locales globally so keys resolve even before the I18nProvider mounts.
  registerTranslations(coursesLocales)

  // Scope Supabase queries to the active organization (the creator/tenant). The
  // mock provider ignores this; the Supabase provider appends .eq('tenant_id').
  setCoursesTenantResolver(() => useOrganizationStore.getState().currentOrg?.id)

  // Defensive default: if the host app didn't set a provider, fall back to a
  // mock so the admin still renders. Apps that share admin↔member set their own.
  if (!getCoursesProviderOptional()) {
    setCoursesProvider(createMockCoursesProvider())
  }

  const base = options?.navPosition ?? 1
  const section = options?.navSection ?? 'main'

  return {
    id: 'courses',
    name: options?.navLabel ?? 'Courses',
    icon: 'BookOpen',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'courses', label: 'Courses', group: 'Courses' },
      { id: 'courses.sales', label: 'Sales', group: 'Courses' },
      { id: 'courses.finance', label: 'Financial', group: 'Courses' },
    ],
    navigation: [
      { section, position: base, label: options?.navLabel ?? 'Courses', route: '/courses', icon: 'BookOpen', permission: read('courses') },
      { section, position: base + 1, label: 'Members area', route: '/courses/members', icon: 'GraduationCap', permission: read('courses') },
      { section, position: base + 2, label: 'Sales', route: '/courses/sales', icon: 'TrendingUp', permission: read('courses.sales') },
      { section, position: base + 3, label: 'Subscriptions', route: '/courses/subscriptions', icon: 'Repeat', permission: read('courses.sales') },
      { section, position: base + 4, label: 'Financial', route: '/courses/financial', icon: 'CreditCard', permission: read('courses.finance') },
      { section, position: base + 5, label: 'Reports', route: '/courses/reports', icon: 'BarChart3', permission: read('courses.sales') },
    ],
    routes: [
      // Static segments outscore the `:id` param in the saas router, so these
      // resolve before the editor route (AdminShell sorts by routeScore).
      { path: '/courses', component: asComp(CoursesListPage), permission: read('courses') },
      { path: '/courses/members', component: asComp(MembersAreaPage), permission: read('courses') },
      { path: '/courses/sales', component: asComp(SalesPage), permission: read('courses.sales') },
      { path: '/courses/subscriptions', component: asComp(SubscriptionsPage), permission: read('courses.sales') },
      { path: '/courses/financial', component: asComp(FinancialPage), permission: read('courses.finance') },
      { path: '/courses/reports', component: asComp(ReportsPage), permission: read('courses.sales') },
      { path: '/courses/:id', component: asComp(CourseEditorPage) },
    ],
    widgets: [],
    dashboardWidgets: createCoursesDashboardWidgets(),
    connectors: [createStripeConnector()],
    settings: [
      { id: 'courses', label: 'Courses', icon: 'BookOpen', component: asComp(CoursesSettingsTab), order: 20, permission: read('courses') },
    ],
    locales: coursesLocales,
  }
}

// Self-register the factory so renderApp(manifest) with a PluginRef { id:
// 'courses' } resolves without a separate plugins.generated.ts entry (apps may
// still register explicitly; registration is idempotent on id).
registerPluginFactory('courses', createCoursesPlugin as (config?: Record<string, unknown>) => PluginManifest)

export { coursesLocales } from './locales'
