import type { BioSection as BioSectionType } from '../../types';
import { renderMarkdown } from '../utils';

interface Props {
  section: BioSectionType;
}

export default function BioSection({ section }: Props) {
  const hasImage = section.imageUrl && section.imagePosition !== 'none';
  const isTop = section.imagePosition === 'top';
  const isSide = section.imagePosition === 'left' || section.imagePosition === 'right';
  const isRight = section.imagePosition === 'right';

  return (
    <section className="py-16 md:py-24 px-6" id={section.id}>
      <div className="max-w-4xl mx-auto">
        {section.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-8"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {section.title}
          </h2>
        )}

        <div className={isSide && hasImage ? `grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start` : ''}>
          {hasImage && isTop && (
            <img
              src={section.imageUrl}
              alt=""
              className="w-full max-h-96 object-cover mb-8"
              style={{ borderRadius: 'var(--pk-radius)' }}
              loading="lazy"
            />
          )}

          {hasImage && isSide && !isRight && (
            <img
              src={section.imageUrl}
              alt=""
              className="w-full aspect-[3/4] object-cover"
              style={{ borderRadius: 'var(--pk-radius)' }}
              loading="lazy"
            />
          )}

          <div
            className="prose prose-invert max-w-none text-base md:text-lg leading-relaxed [&_p]:mb-4 [&_strong]:font-semibold [&_a]:underline [&_a]:decoration-[var(--pk-primary)]"
            style={{ color: 'var(--pk-muted)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
          />

          {hasImage && isSide && isRight && (
            <img
              src={section.imageUrl}
              alt=""
              className="w-full aspect-[3/4] object-cover"
              style={{ borderRadius: 'var(--pk-radius)' }}
              loading="lazy"
            />
          )}
        </div>
      </div>
    </section>
  );
}
