import type { HeroSection as HeroSectionType, BioIdentity, BioBranding } from '../../types';

interface Props {
  section: HeroSectionType;
  identity: BioIdentity;
  branding: BioBranding;
}

export default function HeroSection({ section, identity, branding }: Props) {
  const hasLogo = section.showLogo && branding.logoUrl;

  return (
    <section
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      id={section.id}
    >
      {/* Background image (skipped when no image — overlay carries the visual) */}
      <div className="absolute inset-0">
        {section.backgroundImageUrl && (
          <img
            src={section.backgroundImageUrl}
            alt={identity.name}
            className="h-full w-full object-cover"
          />
        )}
        {section.overlayGradient && (
          <div className="absolute inset-0" style={{ background: section.overlayGradient }} />
        )}
      </div>

      {/* Content — always centered */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-24">
        {hasLogo ? (
          <img
            src={branding.logoUrl}
            alt={`${identity.name} logo`}
            className="mb-6 h-48 w-auto md:h-64 lg:h-80 object-contain drop-shadow-2xl"
          />
        ) : (
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 drop-shadow-lg"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {identity.name}
          </h1>
        )}

        {identity.tagline && (
          <p
            className="text-lg md:text-xl mb-6 max-w-lg opacity-70"
            style={{ color: 'var(--pk-text)' }}
          >
            {identity.tagline}
          </p>
        )}

        {section.showGenres && identity.genres.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {identity.genres.map((genre) => (
              <span
                key={genre}
                className="px-4 py-1.5 text-sm font-semibold backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'var(--pk-primary)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '9999px',
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {section.showLocation && identity.location && (
          <p className="text-sm mt-2 opacity-50" style={{ color: 'var(--pk-text)' }}>
            {identity.location}
          </p>
        )}

        {section.ctaText && section.ctaUrl && (
          <a
            href={section.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block px-10 py-4 font-bold text-lg tracking-wider transition-transform hover:scale-105"
            style={{
              backgroundColor: 'var(--pk-primary)',
              color: 'var(--pk-bg)',
              borderRadius: '9999px',
            }}
          >
            {section.ctaText}
          </a>
        )}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce opacity-40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--pk-text)' }}>
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}
