// ---------------------------------------------------------------------------
// @fayz-ai/plugin-linkinbio — domain types.
//
// A BioPage is a komi/linktree-style public page for any creator: an identity +
// branding + an ordered list of content blocks (held in `sections` for backward
// compatibility with existing `press_kits.data` jsonb payloads). The block union
// is a discriminated union on `type`; the built-in blocks below cover the common
// creator surfaces, and hosts can register niche block types via `registerBlock`.
// ---------------------------------------------------------------------------

// ── Media primitives ──

export interface BioMediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16' | '3:4';
}

export interface BioSocialLink {
  platform:
    | 'instagram'
    | 'spotify'
    | 'soundcloud'
    | 'youtube'
    | 'tiktok'
    | 'whatsapp'
    | 'email'
    | 'twitter'
    | 'facebook'
    | 'bandcamp'
    | 'mixcloud'
    | 'beatport'
    | 'apple-music'
    | 'deezer'
    | 'telegram'
    | 'website'
    | 'drive'
    | 'custom';
  url: string;
  label?: string;
  icon?: string;
}

// ── Branding ──

export interface BioBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  fontHeading?: string;
  fontBody?: string;
  logoUrl?: string;
  backgroundImageUrl?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  sectionAltBg?: string;      // alternate section background (e.g. wine/dark brown)
  sectionAltBg2?: string;     // third background variant for variety
}

export interface BioFloatingCTA {
  label: string;
  url: string;
}

// ── Identity ──

export interface BioIdentity {
  name: string;
  slug: string;
  tagline?: string;
  genres: string[];
  location?: string;
  pronouns?: string;
}

// ── SEO ──

export interface BioSEO {
  title?: string;
  description?: string;
  ogImageUrl?: string;
}

// ── Block types (discriminated union) ──

interface BioBlockBase {
  id: string;
  label?: string;
  title?: string;
  visible?: boolean;
}

export interface HeroSection extends BioBlockBase {
  type: 'hero';
  backgroundImageUrl: string;
  backgroundImageUrls?: string[];
  overlayGradient?: string;
  layout?: 'centered' | 'bottom-left' | 'bottom-center' | 'split';
  showLogo?: boolean;
  showGenres?: boolean;
  showLocation?: boolean;
  ctaText?: string;
  ctaUrl?: string;
}

export interface BioSection extends BioBlockBase {
  type: 'bio';
  content: string;
  imageUrl?: string;
  imagePosition?: 'left' | 'right' | 'top' | 'none';
}

export interface GallerySection extends BioBlockBase {
  type: 'gallery';
  media: BioMediaItem[];
  layout?: 'grid' | 'masonry' | 'carousel' | 'featured-grid';
  columns?: 2 | 3 | 4;
}

export interface VideoGridSection extends BioBlockBase {
  type: 'video-grid';
  videos: {
    platform: 'youtube' | 'vimeo';
    videoId: string;
    title?: string;
    thumbnailUrl?: string;
  }[];
  layout?: 'grid' | 'list' | 'featured';
  channelUrl?: string;
}

export interface SocialLinksSection extends BioBlockBase {
  type: 'social-links';
  links: BioSocialLink[];
  layout?: 'icons' | 'buttons' | 'list';
}

export interface EmbedSection extends BioBlockBase {
  type: 'embed';
  embedType: 'soundcloud' | 'spotify' | 'youtube' | 'bandcamp' | 'mixcloud' | 'custom';
  embedUrl: string;
  embedHtml?: string;
  aspectRatio?: '1:1' | '16:9' | 'auto';
  height?: number;
}

export interface ProjectSection extends BioBlockBase {
  type: 'project';
  content?: string;
  media?: BioMediaItem[];
  links?: { label: string; url: string }[];
  date?: string;
  tags?: string[];
  layout?: 'card' | 'full-width' | 'side-by-side';
}

export interface StatsSection extends BioBlockBase {
  type: 'stats';
  stats: {
    value: string;
    label: string;
    icon?: string;
  }[];
  layout?: 'row' | 'grid';
}

export interface VenueListSection extends BioBlockBase {
  type: 'venue-list';
  venues: {
    name: string;
    city?: string;
    country?: string;
    logoUrl?: string;
    year?: string;
  }[];
  layout?: 'grid' | 'list' | 'logo-cloud';
}

export interface CTASection extends BioBlockBase {
  type: 'cta';
  content?: string;
  whatsappNumber?: string;
  whatsappMessage?: string;
  email?: string;
  bookingUrl?: string;
  ctaButtons: {
    label: string;
    url: string;
    variant?: 'primary' | 'secondary' | 'outline';
    icon?: string;
  }[];
}

export interface TextSection extends BioBlockBase {
  type: 'text';
  content: string;
}

// ── Komi-style link-hub blocks (mobile-first) ──

/**
 * Full-bleed profile header: hero/portrait image with the name overlaid, an
 * optional social-icon row, and optional quick-nav pills that scroll to blocks
 * by id. This is the top block of a `link-hub` page.
 */
export interface ProfileHeaderSection extends BioBlockBase {
  type: 'profile-header';
  imageUrl?: string;
  /**
   * Push the cover image down the page — a reusable framing knob per creator.
   * Any CSS length (e.g. '6vh', '3rem'); adds space above the hero so the
   * subject isn't jammed against the top edge. Default: none.
   */
  imageOffsetTop?: string;
  /** CSS object-position for the cover image crop (e.g. 'center 30%'). Default 'center'. */
  imageObjectPosition?: string;
  overlayGradient?: string;
  showLogo?: boolean;
  showGenres?: boolean;
  showLocation?: boolean;
  /** Social icons under the name. Falls back to page.socialLinks when omitted. */
  socials?: BioSocialLink[];
  /** Quick-nav pills that smooth-scroll to a block id (komi's section nav). */
  navPills?: { label: string; targetId: string }[];
}

/** A single tappable link card (thumbnail + title + subtitle + chevron). */
export interface LinkCardItem {
  title: string;
  subtitle?: string;
  url: string;
  thumbnailUrl?: string;
  /** lucide icon name or social platform key, used when no thumbnail. */
  icon?: string;
  badge?: string;
}

export interface LinksSection extends BioBlockBase {
  type: 'links';
  links: LinkCardItem[];
  layout?: 'list' | 'grid';
}

/** A music release (artwork + title + artist + play/listen CTA). */
export interface MusicReleaseItem {
  title: string;
  artist?: string;
  artworkUrl: string;
  url: string;
}

export interface MusicReleasesSection extends BioBlockBase {
  type: 'music-releases';
  releases: MusicReleaseItem[];
  layout?: 'carousel' | 'grid';
  ctaLabel?: string;
}

/** A tour date (date chip + venue + city + tickets CTA). */
export interface TourDateItem {
  /** ISO-ish date string, e.g. '2026-07-18'. */
  date: string;
  venue: string;
  city?: string;
  /** Tickets link. With a url → "Ingressos"; without → "Em breve" (or "Esgotado" if soldOut). */
  url?: string;
  soldOut?: boolean;
}

export interface TourDatesSection extends BioBlockBase {
  type: 'tour-dates';
  dates: TourDateItem[];
  ctaLabel?: string;
}

/** A single large featured link (image + headline + CTA) — komi's "Out Now". */
export interface FeaturedSection extends BioBlockBase {
  type: 'featured';
  headline: string;
  subtitle?: string;
  imageUrl?: string;
  url: string;
  ctaLabel?: string;
}

/** The union of every built-in block. Host-registered niche blocks widen this at runtime. */
export type BioBlock =
  | HeroSection
  | BioSection
  | GallerySection
  | VideoGridSection
  | SocialLinksSection
  | EmbedSection
  | ProjectSection
  | StatsSection
  | VenueListSection
  | CTASection
  | TextSection
  | ProfileHeaderSection
  | LinksSection
  | MusicReleasesSection
  | TourDatesSection
  | FeaturedSection;

// ── Root schema ──

export interface BioPage {
  identity: BioIdentity;
  branding: BioBranding;
  seo: BioSEO;
  socialLinks: BioSocialLink[];
  /** Ordered content blocks. Named `sections` for backward compat with press_kits.data. */
  sections: BioBlock[];
  floatingCta?: BioFloatingCTA;
  /**
   * Page shell: 'scroll' (default) is the full-bleed EPK/press-kit scroll; 'hub'
   * is the komi/linktree centered narrow column (mobile-first link hub, no
   * alternating section backgrounds).
   */
  layout?: 'scroll' | 'hub';
  /**
   * Press/media kit — a downloadable-assets modal for bookers. Photos, logo and
   * bio are auto-derived from the page; add `driveUrl` (full kit) and extra
   * `assets` (rider, tech sheet, etc.) here.
   */
  mediaKit?: {
    driveUrl?: string;
    assets?: { label: string; url: string; kind?: 'image' | 'logo' | 'doc' | 'audio' | 'link' }[];
  };
  template?: string;
  updatedAt?: string;
}
