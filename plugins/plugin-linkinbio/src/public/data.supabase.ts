/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClientOptional } from '@fayz-ai/core';
import type { BioPage } from '../types';
import type { BioPageDataProvider } from './data';

export interface SupabaseBioPageOptions {
  /**
   * Table holding bio pages. Defaults to `press_kits` — a jsonb `data` column
   * with the full BioPage payload, plus `slug` and `is_published` columns and
   * an RLS policy allowing anon SELECT when `is_published` is true.
   */
  table?: string;
}

export function createSupabaseBioPageProvider(options: SupabaseBioPageOptions = {}): BioPageDataProvider {
  const table = options.table ?? 'press_kits';
  return {
    async getBySlug(slug: string): Promise<BioPage | null> {
      const client = getSupabaseClientOptional() as any;
      if (!client) return null;
      const { data, error } = await client
        .from(table)
        .select('data, is_published')
        .eq('slug', slug)
        .maybeSingle();
      if (error || !data) return null;
      if (!data.is_published) return null;
      return data.data as BioPage;
    },
  };
}
