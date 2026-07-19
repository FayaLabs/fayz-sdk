import type { EmbedSection as EmbedSectionType } from '../../types';

interface Props {
  section: EmbedSectionType;
}

export default function EmbedSection({ section }: Props) {
  const isVideo = section.aspectRatio === '16:9' || section.embedType === 'youtube';
  const height = section.height ?? (isVideo ? undefined : 352);

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

        {section.embedHtml && section.embedType === 'custom' ? (
          <div
            className="overflow-hidden"
            style={{ borderRadius: 'var(--pk-radius)' }}
            dangerouslySetInnerHTML={{ __html: section.embedHtml }}
          />
        ) : isVideo ? (
          <div className="aspect-video overflow-hidden" style={{ borderRadius: 'var(--pk-radius)' }}>
            <iframe
              src={section.embedUrl}
              className="h-full w-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={section.title ?? 'Embed'}
            />
          </div>
        ) : (
          <div className="overflow-hidden" style={{ borderRadius: 'var(--pk-radius)', height }}>
            <iframe
              src={section.embedUrl}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen"
              loading="lazy"
              title={section.title ?? 'Embed'}
            />
          </div>
        )}
      </div>
    </section>
  );
}
