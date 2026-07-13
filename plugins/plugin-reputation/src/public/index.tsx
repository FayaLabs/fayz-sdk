import { createElement, type FC, type ReactNode } from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { createSafeDataProvider } from '@fayz-ai/core'
import { createMockReputationProvider, type ReputationSeed } from '../data/mock'
import { createSupabaseReputationProvider } from '../data/supabase'
import { ReputationProvider, type ReputationContextValue } from '../context'
import { ReviewsList } from '../components/ReviewsList'
import type { ReputationDataProvider } from '../data/types'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-reputation/public — website reviews surface.
//
// Lean entry (no admin ReputationHome / @fayz-ai/ui). Returns a { manifest,
// Provider } bundle the host reads uniformly: the Provider wraps the app root so
// useReviews()/useReviewSummary() power the host's own review markup, and
// manifest.routes ships an optional /reviews page.
// ---------------------------------------------------------------------------

export interface ReputationWebsiteOptions {
  /** Base path for the optional public "all reviews" page. Default '/reviews'. */
  basePath?: string
  /** Seed reviews + summary for the mock provider (used until a real backend is wired). */
  seed?: ReputationSeed
  /** Inject a custom provider. Overrides the safe mock/Supabase resolver. */
  dataProvider?: ReputationDataProvider
  /** Heading for the optional /reviews screen. */
  heading?: string
  scope?: PluginScope
  verticalId?: VerticalId
}

export interface ReputationWebsitePlugin {
  manifest: PluginManifest
  Provider: FC<{ children: ReactNode }>
  dataProvider: ReputationDataProvider
}

export function createReputationWebsite(options?: ReputationWebsiteOptions): ReputationWebsitePlugin {
  const basePath = options?.basePath ?? '/reviews'
  const heading = options?.heading ?? 'O que os pacientes dizem'
  const provider =
    options?.dataProvider ??
    createSafeDataProvider(
      () => createSupabaseReputationProvider(),
      () => createMockReputationProvider({ seed: options?.seed }),
    )

  const value: ReputationContextValue = { provider }
  const Provider: FC<{ children: ReactNode }> = ({ children }) =>
    createElement(ReputationProvider, { value, children })
  Provider.displayName = 'ReputationWebsiteProvider'

  const ReviewsScreen: FC<unknown> = () => createElement(ReviewsList, { heading })
  ReviewsScreen.displayName = 'ReviewsScreen'

  const manifest: PluginManifest = {
    id: 'reputation',
    name: 'Reviews',
    icon: 'Star',
    version: '0.1.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    scaffolds: ['website', 'landing_page'],
    defaultEnabled: true,
    dependencies: [],
    navigation: [],
    routes: [{ path: basePath, component: ReviewsScreen, guard: 'public' }],
    widgets: [],
  }

  return { manifest, Provider, dataProvider: provider }
}

// Public API — website surface
export type { Review, ReviewSummary, ReviewSource, ReviewListQuery } from '../types'
export type { ReputationDataProvider } from '../data/types'
export { createMockReputationProvider, createSupabaseReputationProvider } from '../data'
export type { ReputationSeed } from '../data/mock'
export { ReputationProvider, useReputationContext } from '../context'
export type { ReputationContextValue } from '../context'
export { useReviews, useReviewSummary } from '../hooks'
export { ReviewsList } from '../components/ReviewsList'
