import { describe, it, expect } from 'vitest';
import { assertPluginManifestContract } from '@fayz-ai/core/testing';
import { createPublicLinkInBioPlugin } from '../createPublicLinkInBioPlugin';
import type { BioPage } from '../../types';

const demo: BioPage = {
  identity: { name: 'Demo', slug: 'demo', genres: [] },
  branding: {
    primaryColor: '#F97316',
    secondaryColor: '#FFB347',
    accentColor: '#FFCF40',
    backgroundColor: '#0A0A0A',
    textColor: '#FFFFFF',
    mutedTextColor: '#9CA3AF',
  },
  seo: {},
  socialLinks: [],
  sections: [{ id: 'hero', type: 'hero', backgroundImageUrl: '', showGenres: true }],
};

describe('createPublicLinkInBioPlugin', () => {
  it('returns a manifest that passes the plugin contract', () => {
    const { manifest } = createPublicLinkInBioPlugin({ seed: { demo } });
    expect(() => assertPluginManifestContract(manifest)).not.toThrow();
  });

  it('exposes a public route at basePath/:slug', () => {
    const { manifest } = createPublicLinkInBioPlugin({ basePath: '/p' });
    const route = manifest.routes.find((r) => r.guard === 'public');
    expect(route?.path).toBe('/p/:slug');
    expect(route?.component).toBeTruthy();
  });

  it('mock provider resolves a seeded page and returns null for unknown slugs', async () => {
    const { dataProvider } = createPublicLinkInBioPlugin({ useSupabase: false, seed: { demo } });
    expect(await dataProvider.getBySlug('demo')).toEqual(demo);
    expect(await dataProvider.getBySlug('nope')).toBeNull();
  });
});
