import type { ProjectSection as ProjectSectionType } from '../../types';
import { renderMarkdown } from '../utils';

interface Props {
  section: ProjectSectionType;
}

export default function ProjectSection({ section }: Props) {
  const isSideBySide = section.layout === 'side-by-side';
  const hasMedia = section.media && section.media.length > 0;
  const firstMedia = hasMedia ? section.media![0] : null;
  const isVideo = firstMedia?.type === 'video';

  const MediaBlock = () => {
    if (!firstMedia) return null;
    if (isVideo) {
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%', borderRadius: 'var(--pk-radius)', overflow: 'hidden' }}>
          <iframe
            src={firstMedia.url}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={firstMedia.alt ?? section.title ?? 'Video'}
          />
        </div>
      );
    }
    return (
      <img
        src={firstMedia.url}
        alt={firstMedia.alt ?? ''}
        className="w-full h-full object-cover"
        style={{ borderRadius: 'var(--pk-radius)' }}
        loading="lazy"
      />
    );
  };

  const ContentBlock = () => (
    <div className="flex flex-col justify-center">
      {section.label && (
        <span
          className="inline-block self-start px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] mb-5"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--pk-accent)',
            border: '1px solid var(--pk-accent)',
            borderRadius: '4px',
          }}
        >
          {section.label}
        </span>
      )}

      {section.title && (
        <h2
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5"
          style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
        >
          {section.title}
        </h2>
      )}

      {section.content && (
        <div
          className="text-base md:text-lg leading-relaxed [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-white [&_em]:italic"
          style={{ color: 'var(--pk-muted)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
        />
      )}

      {section.tags && section.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {section.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-medium"
              style={{
                color: 'var(--pk-muted)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--pk-radius)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {section.links && section.links.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-6">
          {section.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium underline underline-offset-4 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--pk-primary)' }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="py-20 md:py-28 px-6" id={section.id}>
      <div className="max-w-5xl mx-auto">
        {isSideBySide && hasMedia ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="order-1">
              <ContentBlock />
            </div>
            <div className="order-2">
              <MediaBlock />
            </div>
          </div>
        ) : (
          <div>
            <ContentBlock />
            {hasMedia && (
              <div className={`grid grid-cols-1 gap-4 mt-8 ${section.media!.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {section.media!.map((item, i) =>
                  item.type === 'video' ? (
                    <div key={i} className="aspect-video overflow-hidden" style={{ borderRadius: 'var(--pk-radius)' }}>
                      <iframe
                        src={item.url}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        title={item.alt ?? 'Video'}
                      />
                    </div>
                  ) : (
                    <img
                      key={i}
                      src={item.url}
                      alt={item.alt ?? ''}
                      className="w-full aspect-[4/3] object-cover"
                      style={{ borderRadius: 'var(--pk-radius)' }}
                      loading="lazy"
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
