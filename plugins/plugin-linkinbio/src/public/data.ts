import type { BioPage } from '../types';

// ---------------------------------------------------------------------------
// BioPageDataProvider — the read seam for the public bio page.
//
// Two implementations ship: a mock provider seeded from an in-memory map (host
// config / demo content) and a Supabase provider (data.supabase.ts). The
// factory picks between them via createSafeDataProvider — Supabase when a global
// client is configured, mock otherwise.
// ---------------------------------------------------------------------------

export interface BioPageDataProvider {
  /** Resolve a published bio page by its public slug, or null when missing/unpublished. */
  getBySlug(slug: string): Promise<BioPage | null>;
}

export interface MockBioPageOptions {
  /** slug → BioPage map used as the mock catalog. */
  seed?: Record<string, BioPage>;
}

export function createMockBioPageProvider(options: MockBioPageOptions = {}): BioPageDataProvider {
  const seed = options.seed ?? {};
  return {
    async getBySlug(slug: string): Promise<BioPage | null> {
      return seed[slug] ?? null;
    },
  };
}
