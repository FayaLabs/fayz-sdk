import type { VenueListSection as VenueListSectionType } from '../../types';

interface Props {
  section: VenueListSectionType;
}

export default function VenueListSection({ section }: Props) {
  const layout = section.layout ?? 'grid';

  return (
    <section className="py-16 md:py-24 px-6" id={section.id}>
      <div className="max-w-5xl mx-auto">
        {section.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-10"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {section.title}
          </h2>
        )}

        {layout === 'logo-cloud' ? (
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {section.venues.map((venue, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                {venue.logoUrl ? (
                  <img src={venue.logoUrl} alt={venue.name} className="h-12 w-12 object-contain opacity-70" loading="lazy" />
                ) : (
                  <div
                    className="h-12 w-12 flex items-center justify-center text-lg font-bold opacity-70"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--pk-text)', borderRadius: 'var(--pk-radius)' }}
                  >
                    {venue.name[0]}
                  </div>
                )}
                <span className="text-xs text-center" style={{ color: 'var(--pk-muted)' }}>{venue.name}</span>
              </div>
            ))}
          </div>
        ) : layout === 'list' ? (
          <div className="space-y-3">
            {section.venues.map((venue, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 px-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 'var(--pk-radius)' }}
              >
                <span className="font-medium" style={{ color: 'var(--pk-text)' }}>{venue.name}</span>
                <span className="text-sm" style={{ color: 'var(--pk-muted)' }}>
                  {[venue.city, venue.year].filter(Boolean).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* Organic flowing tag cloud */
          <div className="flex flex-wrap gap-3">
            {section.venues.map((venue, i) => {
              // Vary sizes based on name length and position for organic feel
              const isLong = venue.name.length > 12;
              const isShort = venue.name.length < 6;
              const sizeClass = isLong ? 'text-base md:text-lg px-6 py-3' : isShort ? 'text-sm px-4 py-2.5' : 'text-sm md:text-base px-5 py-3';
              // Alternate subtle visual weight
              const isHighlight = i % 5 === 0 || i % 7 === 0;
              return (
                <div
                  key={i}
                  className={`inline-flex flex-col items-start transition-all duration-300 hover:scale-105 ${sizeClass}`}
                  style={{
                    backgroundColor: isHighlight ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isHighlight ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '9999px',
                  }}
                >
                  <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--pk-text)' }}>
                    {venue.name}
                    {venue.city && (
                      <span className="font-normal ml-2 opacity-50" style={{ color: 'var(--pk-muted)', fontSize: '0.8em' }}>
                        {venue.city}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
