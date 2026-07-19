// ---------------------------------------------------------------------------
// @fayz-ai/plugin-linkinbio/public — customer-facing link-in-bio surface.
//
// A komi/linktree-style public bio page for any creator: identity + branding +
// an ordered list of content blocks. Separate entry from the admin plugin so a
// website host imports only the renderer + data seam (no editor graph).
//
// Data: BioPageDataProvider — a seeded mock by default, Supabase (`press_kits`
// jsonb) when a global client is configured. Extend the block set with
// registerBlock(type, component).
// ---------------------------------------------------------------------------

export { createPublicLinkInBioPlugin } from './createPublicLinkInBioPlugin';
export type { PublicLinkInBioOptions, PublicLinkInBioPlugin } from './createPublicLinkInBioPlugin';

export { default as BioPageRenderer } from './BioPageRenderer';
export type { BioPageRendererProps } from './BioPageRenderer';
export { default as BioPage } from './BioPage';
export { LinkInBioProvider, useLinkInBio } from './context';
export type { LinkInBioContextValue } from './context';

// Block registry — the extensibility seam
export { registerBlock, getBlock, hasBlock } from './registry';
export type { BlockRenderProps, BlockComponent } from './registry';

// Data seam
export { createMockBioPageProvider } from './data';
export type { BioPageDataProvider, MockBioPageOptions } from './data';
export { createSupabaseBioPageProvider } from './data.supabase';
export type { SupabaseBioPageOptions } from './data.supabase';

// Rendering helpers (useful inside custom blocks)
export {
  renderMarkdown,
  platformColors,
  platformLabels,
  platformIconMap,
  borderRadiusMap,
  getBrandingVars,
} from './utils';

// Domain types
export type {
  BioPage as BioPageData,
  BioBlock,
  BioBranding,
  BioIdentity,
  BioSEO,
  BioSocialLink,
  BioMediaItem,
  BioFloatingCTA,
  HeroSection,
  BioSection,
  GallerySection,
  VideoGridSection,
  SocialLinksSection,
  EmbedSection,
  ProjectSection,
  StatsSection,
  VenueListSection,
  CTASection,
  TextSection,
  ProfileHeaderSection,
  LinksSection,
  LinkCardItem,
  MusicReleasesSection,
  MusicReleaseItem,
  TourDatesSection,
  TourDateItem,
  FeaturedSection,
} from '../types';

// Shared UI (useful when composing custom blocks)
export { Reveal } from './components/Reveal';
export { Carousel } from './components/Carousel';
