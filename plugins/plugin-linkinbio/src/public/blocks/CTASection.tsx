import type { CTASection as CTASectionType } from '../../types';
import { renderMarkdown } from '../utils';

interface Props {
  section: CTASectionType;
}

export default function CTASection({ section }: Props) {
  return (
    <section className="py-24 md:py-36 px-6 text-center" id={section.id}>
      <div className="max-w-2xl mx-auto">
        {section.title && (
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {section.title}
          </h2>
        )}

        {section.content && (
          <div
            className="text-base md:text-lg mb-10 [&_p]:mb-2"
            style={{ color: 'var(--pk-muted)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
          />
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          {section.ctaButtons.map((btn) => {
            const isPrimary = btn.variant === 'primary';
            const isOutline = btn.variant === 'outline';
            return (
              <a
                key={btn.url}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-10 py-4 text-base font-bold tracking-[0.1em] uppercase transition-all duration-300 hover:scale-105 min-w-[200px]"
                style={{
                  backgroundColor: isPrimary ? 'var(--pk-primary)' : isOutline ? 'transparent' : 'var(--pk-secondary)',
                  color: isPrimary ? 'var(--pk-bg)' : 'var(--pk-text)',
                  border: isOutline ? '2px solid rgba(255,255,255,0.2)' : 'none',
                  borderRadius: '9999px',
                  boxShadow: isPrimary ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {btn.label}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
