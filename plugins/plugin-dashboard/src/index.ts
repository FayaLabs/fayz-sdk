import React from 'react'
import type { PluginManifest, PluginScope, VerticalId, DashboardWidgetDef, DashboardLayoutConfig } from '@fayz-ai/core'
import { DashboardCanvas, type DashboardCanvasProps } from '@fayz-ai/ui'
import { DashboardPage } from './DashboardPage'
import { metricsToWidgets, sectionsToWidgets, onboardingToWidget } from './builders'
import { dashboardLocales } from './locales'
import type { DashboardMetric, DashboardSection, OnboardingStep } from './types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DashboardPluginLabels {
  pageTitle: string
  pageSubtitle: string
  kpiTitle: string
  onboardingTitle: string
  onboardingSubtitle: string
  settingsTitle: string
}

export interface DashboardPluginOptions {
  /** KPI metrics to show on the dashboard */
  metrics?: DashboardMetric[]
  /** Custom sections injected by the consumer app */
  sections?: DashboardSection[]
  /** Onboarding steps for the getting-started checklist */
  onboardingSteps?: OnboardingStep[]
  /** Label overrides */
  labels?: Partial<DashboardPluginLabels>
  /** Currency config for metrics that use 'currency' format */
  currency?: { code?: string; locale?: string; symbol?: string }
  /** Plugin scope */
  scope?: PluginScope
  /** Vertical ID */
  verticalId?: VerticalId
  /** Whether to show onboarding module. Default: true if onboardingSteps provided */
  showOnboarding?: boolean
  /** Nav position (default: 0 — first item) */
  navPosition?: number
  /** Nav section (default: 'main') */
  navSection?: 'main' | 'secondary'
  /** Navigation icon override (default: 'LayoutDashboard') */
  navIcon?: string
  /** Skip adding a navigation entry (use when the consumer app provides its own page entry for '/') */
  skipNavigation?: boolean
  /** Render the in-content title/subtitle. Set false when the app shell owns the
   *  page title (sidebar/GHL-style layouts). Default: true. */
  showHeader?: boolean
  /** App-level curation of the home surface — which widgets show, order, span.
   *  Applied on top of every plugin's registered defaults. */
  layout?: DashboardLayoutConfig
  /** Custom widgets the consumer app contributes directly to the home surface. */
  customWidgets?: DashboardWidgetDef[]
  /** Show the shared, sticky time-range control on the home. Pass `true` for
   *  defaults (7d/30d/90d) or an options object. Widgets read it via
   *  useDashboardRange(); provide `onChange` to drive app-level refetching. */
  range?: DashboardCanvasProps['range']
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: DashboardPluginLabels = {
  pageTitle: 'Dashboard',
  pageSubtitle: 'Business overview',
  kpiTitle: 'Key Metrics',
  onboardingTitle: 'Getting Started',
  onboardingSubtitle: 'Complete these steps to set up your business',
  settingsTitle: 'Dashboard',
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDashboardPlugin(options?: DashboardPluginOptions): PluginManifest {
  const labels: DashboardPluginLabels = { ...DEFAULT_LABELS, ...options?.labels }
  const onboardingSteps = options?.onboardingSteps ?? []
  const showOnboarding = options?.showOnboarding ?? onboardingSteps.length > 0

  // Everything the dashboard plugin owns flows through the widget registry:
  // legacy metrics/sections, the onboarding checklist, and app custom widgets.
  const dashboardWidgets: DashboardWidgetDef[] = [
    ...metricsToWidgets(options?.metrics ?? [], options?.currency),
    ...sectionsToWidgets(options?.sections ?? []),
    ...(showOnboarding && onboardingSteps.length > 0
      ? [onboardingToWidget(onboardingSteps, { title: labels.onboardingTitle, subtitle: labels.onboardingSubtitle })]
      : []),
    ...(options?.customWidgets ?? []),
  ]

  const PageComponent: React.ComponentType<unknown> = () =>
    React.createElement(DashboardCanvas, {
      surface: 'home',
      title: labels.pageTitle,
      subtitle: labels.pageSubtitle,
      showHeader: options?.showHeader,
      appLayout: options?.layout,
      range: options?.range,
    })

  return {
    id: 'dashboard',
    name: labels.pageTitle,
    icon: 'LayoutDashboard',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'dashboard', label: labels.pageTitle, group: 'Core' },
    ],

    navigation: options?.skipNavigation ? [] : [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 0,
        label: labels.pageTitle,
        route: '/',
        icon: options?.navIcon ?? 'LayoutDashboard',
      },
    ],

    routes: [
      {
        path: '/',
        component: PageComponent,
      },
    ],

    widgets: [],
    dashboardWidgets,

    aiTools: [
      {
        id: 'dashboard.kpi-summary',
        name: 'getKpiSummary',
        description: 'Returns a summary of all KPI metrics for the current dashboard, including trends and comparisons.',
        icon: 'BarChart3',
        mode: 'read' as const,
        category: 'Dashboard',
        parameters: {
          type: 'object' as const,
          properties: {
            category: {
              type: 'string' as const,
              description: 'Filter by metric category',
              enum: ['revenue', 'operations', 'clients', 'custom', 'all'],
            },
          },
        },
        suggestions: [
          { label: 'How is my business doing today?' },
          { label: "What's my revenue today?" },
          { label: 'Give me a summary of today' },
        ],
      },
    ],

    locales: dashboardLocales,
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { DashboardPage } from './DashboardPage'
export {
  DashboardCanvas,
  DashboardNavigateProvider,
  useDashboardNavigate,
  resolveDashboardLayout,
  useDashboardPreferences,
  type DashboardCanvasProps,
  type LaidOutWidget,
  type DashboardPreferencesState,
} from '@fayz-ai/ui'
export {
  metricsToWidgets,
  sectionsToWidgets,
  onboardingToWidget,
} from './builders'

export type {
  DashboardMetric,
  MetricValue,
  MetricCategory,
  MetricFormat,
  ResolvedMetric,
  DashboardSection,
  DashboardSectionProps,
  DashboardZone,
  OnboardingStep,
  OnboardingProgress,
  DashboardPreferences,
} from './types'
