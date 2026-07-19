import { createElement, type FC, type ReactNode } from 'react';
import { createSafeDataProvider, type PluginManifest, type PluginScope, type VerticalId } from '@fayz-ai/core';
import type { BioPage } from '../types';
import { createMockBioPageProvider, type BioPageDataProvider } from './data';
import { createSupabaseBioPageProvider } from './data.supabase';
import { LinkInBioProvider, type LinkInBioContextValue } from './context';
import BioPageRoute from './BioPage';

export interface PublicLinkInBioOptions {
  /** Mount prefix for the public bio route. The route is `${basePath}/:slug`. Default '/p'. */
  basePath?: string;
  /**
   * When a Supabase client is configured (setGlobalSupabaseClient) this selects
   * the Supabase-backed provider. Omit to force the seeded mock provider.
   */
  useSupabase?: boolean;
  /** Table holding bio pages (Supabase mode). Default 'press_kits'. */
  table?: string;
  /** Inject a custom provider (overrides the mock/Supabase safe resolver). */
  dataProvider?: BioPageDataProvider;
  /** Seed catalog for the mock provider: slug → BioPage (host config / demo content). */
  seed?: Record<string, BioPage>;
  /** Optional "made with" footer link rendered on every page. */
  poweredBy?: { label: string; url: string };
  /** Fallback `<title>` suffix when a page omits seo.title. Default 'Bio'. */
  titleSuffix?: string;
  scope?: PluginScope;
  verticalId?: VerticalId;
  defaultEnabled?: boolean;
}

export interface PublicLinkInBioPlugin {
  manifest: PluginManifest;
  Provider: FC<{ children: ReactNode }>;
  dataProvider: BioPageDataProvider;
}

export function createPublicLinkInBioPlugin(options: PublicLinkInBioOptions = {}): PublicLinkInBioPlugin {
  const basePath = options.basePath ?? '/p';
  const table = options.table ?? 'press_kits';
  const seed = options.seed ?? {};

  // Resolution: explicit dataProvider → Supabase (when a global client is
  // configured AND useSupabase !== false) → seeded mock. Deferred + memoized so
  // importing the plugin never forces a Supabase connection.
  const provider: BioPageDataProvider =
    options.dataProvider ??
    (options.useSupabase === false
      ? createMockBioPageProvider({ seed })
      : createSafeDataProvider<BioPageDataProvider>(
          () => createSupabaseBioPageProvider({ table }),
          () => createMockBioPageProvider({ seed }),
        ));

  const contextValue: LinkInBioContextValue = {
    provider,
    poweredBy: options.poweredBy,
    titleSuffix: options.titleSuffix ?? 'Bio',
  };

  const Provider: FC<{ children: ReactNode }> = ({ children }) =>
    createElement(LinkInBioProvider, { value: contextValue, children });
  Provider.displayName = 'LinkInBioProvider';

  const manifest: PluginManifest = {
    id: 'linkinbio',
    name: 'Link in Bio',
    icon: 'Link',
    version: '0.1.0',
    scope: options.scope ?? 'universal',
    verticalId: options.verticalId,
    scaffolds: ['website', 'landing_page'],
    defaultEnabled: options.defaultEnabled ?? true,
    dependencies: [],
    navigation: [],
    routes: [{ path: `${basePath}/:slug`, component: BioPageRoute, guard: 'public', fullBleed: true }],
    widgets: [],
  };

  return { manifest, Provider, dataProvider: provider };
}
