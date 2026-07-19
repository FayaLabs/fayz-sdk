import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProfileHeaderSection, BioPage } from '../../types';
import { platformLabels } from '../utils';
import { PlatformIcon } from '../components/PlatformIcon';

interface Props {
  section: ProfileHeaderSection;
  page: BioPage;
}

export default function ProfileHeader({ section, page }: Props) {
  const { identity, branding } = page;
  const isHub = page.layout === 'hub';
  const socials = section.socials ?? page.socialLinks ?? [];
  const hasLogo = section.showLogo && branding.logoUrl;

  // Scroll-driven parallax: the image lags while the logo lifts + fades on its
  // own curve, so the hero opens clean (just the logo) and dissolves on scroll.
  const heroRef = useRef<HTMLDivElement>(null);
  const [sy, setSy] = useState(0);
  useEffect(() => {
    const container = document.querySelector('.fixed.inset-0') as HTMLElement | null;
    if (!container) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setSy(container.scrollTop);
        raf = 0;
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const heroH = heroRef.current?.offsetHeight ?? 700;
  const p = Math.min(1, sy / heroH); // 0 → 1 over the hero's height
  // imageOffsetTop nudges the image content DOWN inside the frame (not a margin);
  // the baseline scale (>1) leaves overflow room so no gap opens at the top.
  const imageOffsetTop = section.imageOffsetTop ?? '0px';
  const imageTransform = `translateY(calc(${imageOffsetTop} + ${sy * 0.22}px)) scale(1.18)`;
  const logoTransform = `translateY(${-sy * 0.5}px) scale(${1 - p * 0.12})`;
  const logoOpacity = Math.max(0, 1 - p * 1.25);
  const hintOpacity = Math.max(0, 1 - p * 4);

  const scrollTo = (id: string) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header id={section.id} className="relative">
      {/* Hero — fills the viewport so the page opens clean on just the logo. */}
      <div
        ref={heroRef}
        className={`relative w-full h-[86vh] max-h-[880px] overflow-hidden ${
          isHub ? 'sm:rounded-[26px]' : ''
        }`}
      >
        {section.imageUrl && (
          <img
            src={section.imageUrl}
            alt={identity.name}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
            style={{ transform: imageTransform, objectPosition: section.imageObjectPosition }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              section.overlayGradient ??
              'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 60%, var(--pk-bg) 100%)',
          }}
        />

        {/* Logo (or name) overlaid — its own motion curve */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-6 pb-14">
          {hasLogo ? (
            <img
              src={branding.logoUrl}
              alt={`${identity.name} logo`}
              className="w-[82%] max-w-[380px] h-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] will-change-transform"
              style={{ transform: logoTransform, opacity: logoOpacity }}
            />
          ) : (
            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg will-change-transform"
              style={{
                fontFamily: 'var(--pk-font-heading)',
                color: 'var(--pk-text)',
                transform: logoTransform,
                opacity: logoOpacity,
              }}
            >
              {identity.name}
            </h1>
          )}
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce"
          style={{ opacity: hintOpacity, color: 'var(--pk-text)' }}
        >
          <ChevronDown size={22} />
        </div>
      </div>

      {/* Below the hero (revealed on scroll): tagline, socials, nav */}
      {(identity.tagline || (section.showLocation && identity.location)) && (
        <div className="text-center mt-5 px-4">
          {identity.tagline && (
            <p className="text-base font-medium" style={{ color: 'var(--pk-text)' }}>
              {identity.tagline}
            </p>
          )}
          {section.showLocation && identity.location && (
            <p className="text-xs mt-1 opacity-60" style={{ color: 'var(--pk-muted)' }}>
              {identity.location}
            </p>
          )}
        </div>
      )}

      {/* Social + media-kit icon row */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 px-4">
        {socials.map((link) => (
          <a
            key={link.platform + link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label ?? platformLabels[link.platform] ?? 'Link'}
            className="flex items-center justify-center w-11 h-11 rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--pk-text)' }}
          >
            <PlatformIcon platform={link.platform} size={19} />
          </a>
        ))}
      </div>

      {/* Quick-nav pills */}
      {section.navPills && section.navPills.length > 0 && (
        <nav
          className="flex gap-2 overflow-x-auto scrollbar-hide mt-4 px-4 pb-1 justify-start sm:justify-center"
          aria-label="Seções"
        >
          {section.navPills.map((pill) => (
            <button
              key={pill.targetId}
              type="button"
              onClick={() => scrollTo(pill.targetId)}
              className="whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full transition-colors shrink-0"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'var(--pk-text)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {pill.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
