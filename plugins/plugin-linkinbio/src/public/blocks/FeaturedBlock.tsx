import { ArrowUpRight } from 'lucide-react';
import type { FeaturedSection } from '../../types';

interface Props {
  section: FeaturedSection;
}

export default function FeaturedBlock({ section }: Props) {
  return (
    <section className="py-6" id={section.id}>
      {section.title && (
        <h2
          className="text-xl md:text-2xl font-bold mb-4 px-1"
          style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
        >
          {section.title}
        </h2>
      )}
      <a
        href={section.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 p-4 overflow-hidden transition-all duration-300 hover:scale-[1.01]"
        style={{
          borderRadius: 'var(--pk-radius)',
          border: '1px solid rgba(255,255,255,0.09)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--pk-primary) 14%, transparent), rgba(255,255,255,0.03) 55%)',
        }}
      >
        {section.imageUrl && (
          <div
            className="shrink-0 w-20 h-20 overflow-hidden"
            style={{ borderRadius: 'calc(var(--pk-radius) - 4px)' }}
          >
            <img
              src={section.imageUrl}
              alt={section.headline}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight" style={{ color: 'var(--pk-text)', fontFamily: 'var(--pk-font-heading)' }}>
            {section.headline}
          </p>
          {section.subtitle && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--pk-muted)' }}>
              {section.subtitle}
            </p>
          )}
          {section.ctaLabel && (
            <span
              className="inline-flex items-center gap-1 mt-2 px-3 py-1 text-xs font-semibold rounded-full"
              style={{ backgroundColor: 'var(--pk-primary)', color: 'var(--pk-bg)' }}
            >
              {section.ctaLabel}
            </span>
          )}
        </div>
        <ArrowUpRight
          size={20}
          className="shrink-0 opacity-50 group-hover:opacity-90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
          style={{ color: 'var(--pk-text)' }}
        />
      </a>
    </section>
  );
}
