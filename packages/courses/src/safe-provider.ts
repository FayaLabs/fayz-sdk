import { createSafeDataProvider } from '@fayz-ai/core'
import type { CoursesProvider } from './provider'
import { createSupabaseCoursesProvider } from './supabase-provider'
import { createMockCoursesProvider } from './mock-provider'

/**
 * Picks the Supabase provider when a Supabase client is initialized, else the
 * mock — resolved lazily on first use (mirrors @fayz-ai/plugin-financial's
 * createSafeFinancialProvider). Apps wire this and get real data with a backend,
 * or a seeded demo without one.
 */
export function createSafeCoursesProvider(): CoursesProvider {
  return createSafeDataProvider<CoursesProvider>(
    () => createSupabaseCoursesProvider(),
    () => createMockCoursesProvider(),
  )
}
