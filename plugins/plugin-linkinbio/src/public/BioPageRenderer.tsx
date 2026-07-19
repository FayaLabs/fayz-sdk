import { useState, useEffect, useRef } from 'react';
import { ChevronUp, MessageCircle } from 'lucide-react';
import type { BioPage, BioBlock } from '../types';
import { getBlock } from './registry';
import { Reveal } from './components/Reveal';
import { MediaKit } from './components/MediaKit';
import HeroSection from './blocks/HeroSection';
import BioSection from './blocks/BioSection';
import GallerySection from './blocks/GallerySection';
import VideoGridSection from './blocks/VideoGridSection';
import SocialLinksSection from './blocks/SocialLinksSection';
import EmbedSection from './blocks/EmbedSection';
import ProjectSection from './blocks/ProjectSection';
import StatsSection from './blocks/StatsSection';
import VenueListSection from './blocks/VenueListSection';
import CTASection from './blocks/CTASection';
import TextSection from './blocks/TextSection';
import ProfileHeader from './blocks/ProfileHeader';
import LinksBlock from './blocks/LinksBlock';
import MusicReleasesBlock from './blocks/MusicReleasesBlock';
import TourDatesBlock from './blocks/TourDatesBlock';
import FeaturedBlock from './blocks/FeaturedBlock';

export interface BioPageRendererProps {
  page: BioPage;
  /** Optional "made with" footer link. Omit for just the copyright line. */
  poweredBy?: { label: string; url: string };
}

// Blocks that get alternating backgrounds in scroll mode (hero/header/cta excluded).
const ALT_BG_TYPES = new Set(['bio', 'gallery', 'video-grid', 'project', 'embed', 'stats', 'venue-list', 'text', 'social-links']);

export default function BioPageRenderer({ page, poweredBy }: BioPageRendererProps) {
  const { identity, branding, sections, floatingCta } = page;
  const isHub = page.layout === 'hub';
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showFloatingCta, setShowFloatingCta] = useState(false);

  // Scroll progress & floating CTA visibility
  useEffect(() => {
    const container = scrollRef.current?.closest('.fixed.inset-0') as HTMLElement | null;
    if (!container) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
      setScrollProgress(progress);
      setShowFloatingCta(scrollTop > clientHeight * 0.5);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  // Assign alternating bg to non-hero/cta sections (scroll mode only)
  let altIndex = 0;
  const sectionBgs: Map<string, string | undefined> = new Map();
  if (!isHub) {
    for (const s of sections) {
      if (s.visible === false) continue;
      if (ALT_BG_TYPES.has(s.type)) {
        const bgs = [undefined, 'var(--pk-alt-bg)', 'var(--pk-alt-bg2)'];
        sectionBgs.set(s.id, bgs[altIndex % bgs.length]);
        altIndex++;
      }
    }
  }

  function renderInner(section: BioBlock) {
    // Host-registered niche blocks win over the built-in switch.
    const Custom = getBlock(section.type);
    if (Custom) return <Custom block={section as never} page={page} />;
    switch (section.type) {
      case 'hero':
        return <HeroSection section={section} identity={identity} branding={branding} />;
      case 'profile-header':
        return <ProfileHeader section={section} page={page} />;
      case 'bio':
        return <BioSection section={section} />;
      case 'gallery':
        return <GallerySection section={section} />;
      case 'video-grid':
        return <VideoGridSection section={section} />;
      case 'social-links':
        return <SocialLinksSection section={section} />;
      case 'embed':
        return <EmbedSection section={section} />;
      case 'project':
        return <ProjectSection section={section} />;
      case 'stats':
        return <StatsSection section={section} />;
      case 'venue-list':
        return <VenueListSection section={section} />;
      case 'cta':
        return <CTASection section={section} />;
      case 'text':
        return <TextSection section={section} />;
      case 'links':
        return <LinksBlock section={section} />;
      case 'music-releases':
        return <MusicReleasesBlock section={section} />;
      case 'tour-dates':
        return <TourDatesBlock section={section} />;
      case 'featured':
        return <FeaturedBlock section={section} />;
      default:
        return null;
    }
  }

  function renderSection(section: BioBlock, index: number) {
    if (section.visible === false) return null;
    const inner = renderInner(section);
    if (inner === null) return null;

    // ── Hub layout: everything sits inside the mobile-width column (padding is
    //    provided by the wrapper below). The header renders without a reveal
    //    (it's above the fold); other blocks fade in on scroll.
    if (isHub) {
      // Header breaks out of the column padding to sit full-bleed on mobile;
      // on desktop it becomes a contained rounded card within the column.
      if (section.type === 'profile-header')
        return (
          <div key={section.id} className="-mx-3 -mt-3 sm:mx-0 sm:mt-0">
            {inner}
          </div>
        );
      return <Reveal key={section.id}>{inner}</Reveal>;
    }

    // ── Scroll (press-kit) layout: full-width sections, alternating bg ──
    if (section.type === 'hero') return <div key={section.id}>{inner}</div>;
    const bg = sectionBgs.get(section.id);
    return (
      <div key={section.id} style={bg ? { backgroundColor: bg } : undefined}>
        <Reveal delay={index === 0 ? 0 : 40}>{inner}</Reveal>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-full">
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px]" style={{ backgroundColor: 'transparent' }}>
        <div
          className="h-full transition-[width] duration-100 ease-out"
          style={{
            width: `${scrollProgress * 100}%`,
            background: `linear-gradient(90deg, var(--pk-primary), var(--pk-accent))`,
          }}
        />
      </div>

      {/* Sections + footer. Hub = a centered mobile-width column (komi/linktree
          style) that stays phone-width even on desktop, with breathing room so
          the hero reads as a rounded floating card. */}
      <div className={isHub ? 'max-w-[480px] mx-auto px-3 sm:px-4 pt-3 pb-6' : ''}>
        {sections.map(renderSection)}

        {/* Footer */}
        <footer className="pt-10 pb-24 px-6 text-center" style={{ backgroundColor: 'var(--pk-bg)' }}>
          <p className="text-xs opacity-40" style={{ color: 'var(--pk-muted)' }}>
            &copy; {new Date().getFullYear()} {identity.name}
          </p>
          {poweredBy && (
            <a
              href={poweredBy.url}
              className="text-xs opacity-25 mt-1 hover:opacity-40 transition-opacity"
              style={{ color: 'var(--pk-muted)' }}
            >
              {poweredBy.label}
            </a>
          )}
        </footer>
      </div>

      {/* Floating actions — hub: circular stack (scroll-to-top + primary action,
          presskitpro style); scroll: the classic wide pill. */}
      {isHub ? (
        <div className="fixed z-50 right-4 bottom-6 flex flex-col items-center gap-3">
          <button
            type="button"
            aria-label="Voltar ao topo"
            onClick={() =>
              (scrollRef.current?.closest('.fixed.inset-0') as HTMLElement | null)?.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
            }
            className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300"
            style={{
              opacity: showFloatingCta ? 1 : 0,
              transform: showFloatingCta ? 'none' : 'translateY(12px)',
              pointerEvents: showFloatingCta ? 'auto' : 'none',
              color: 'var(--pk-primary)',
              border: '1.5px solid var(--pk-primary)',
              backgroundColor: 'color-mix(in srgb, var(--pk-bg) 70%, transparent)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <ChevronUp size={20} />
          </button>
          <MediaKit page={page} variant="fab" />
          {floatingCta && (
            <a
              href={floatingCta.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={floatingCta.label}
              className="flex items-center justify-center w-14 h-14 rounded-full transition-transform hover:scale-105"
              style={{
                backgroundColor: 'var(--pk-primary)',
                color: 'var(--pk-bg)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
              }}
            >
              <MessageCircle size={24} />
            </a>
          )}
        </div>
      ) : (
        floatingCta && (
          <a
            href={floatingCta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed z-50 transition-all duration-500 ease-out"
            style={{
              bottom: showFloatingCta ? '2rem' : '-4rem',
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: showFloatingCta ? 1 : 0,
              backgroundColor: 'var(--pk-primary)',
              color: 'var(--pk-bg)',
              fontFamily: 'var(--pk-font-heading)',
              borderRadius: '9999px',
              padding: '1rem 2.5rem',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {floatingCta.label}
          </a>
        )
      )}
    </div>
  );
}
