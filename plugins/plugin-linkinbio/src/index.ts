// ---------------------------------------------------------------------------
// @fayz-ai/plugin-linkinbio — admin entry (v1 stub).
//
// The public bio page ships today via the `/public` entry
// (createPublicLinkInBioPlugin). The in-app editor / settings surface is a v2
// follow-up: this factory returns a minimal manifest with a placeholder view so
// the plugin can be listed in an admin shell without shipping the editor yet.
//
// For the customer-facing page, import from '@fayz-ai/plugin-linkinbio/public'.
// ---------------------------------------------------------------------------
import { createElement } from 'react';
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core';

export interface LinkInBioPluginOptions {
  basePath?: string;
  scope?: PluginScope;
  verticalId?: VerticalId;
  defaultEnabled?: boolean;
}

function EditorPlaceholder() {
  return createElement(
    'div',
    { className: 'p-8 text-sm text-muted-foreground' },
    'O editor de Link in Bio chega no v2. A página pública já está disponível em /p/:slug.',
  );
}

export function createLinkInBioPlugin(options: LinkInBioPluginOptions = {}): PluginManifest {
  const basePath = options.basePath ?? '/link-in-bio';
  return {
    id: 'linkinbio',
    name: 'Link in Bio',
    icon: 'Link',
    version: '0.1.0',
    scope: options.scope ?? 'universal',
    verticalId: options.verticalId,
    scaffolds: ['saas', 'website'],
    defaultEnabled: options.defaultEnabled ?? false,
    dependencies: [],
    navigation: [{ section: 'main', position: 10, label: 'Link in Bio', route: basePath, icon: 'Link' }],
    routes: [{ path: basePath, component: EditorPlaceholder, guard: 'authenticated' }],
    widgets: [],
  };
}

export type {
  BioPage,
  BioBlock,
  BioBranding,
  BioIdentity,
  BioSEO,
  BioSocialLink,
  BioMediaItem,
  BioFloatingCTA,
} from './types';
