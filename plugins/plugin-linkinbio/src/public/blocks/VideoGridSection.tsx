import type { VideoGridSection as VideoGridSectionType } from '../../types';

interface Props {
  section: VideoGridSectionType;
}

export default function VideoGridSection({ section }: Props) {
  const isFeatured = section.layout === 'featured';
  const isList = section.layout === 'list';

  return (
    <section className="py-16 md:py-24 px-6" id={section.id}>
      <div className="max-w-5xl mx-auto">
        {section.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-8"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {section.title}
          </h2>
        )}

        {isFeatured && section.videos.length > 0 ? (
          <div className="space-y-6">
            {/* Featured video */}
            <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: 'var(--pk-radius)' }}>
              <iframe
                src={`https://www.youtube.com/embed/${section.videos[0].videoId}`}
                title={section.videos[0].title ?? 'Video'}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            {section.videos[0].title && (
              <p className="text-sm font-medium" style={{ color: 'var(--pk-muted)' }}>
                {section.videos[0].title}
              </p>
            )}
            {/* Remaining videos */}
            {section.videos.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.videos.slice(1).map((video, i) => (
                  <div key={i}>
                    <div className="aspect-video overflow-hidden" style={{ borderRadius: 'var(--pk-radius)' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${video.videoId}`}
                        title={video.title ?? 'Video'}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    {video.title && (
                      <p className="mt-2 text-sm" style={{ color: 'var(--pk-muted)' }}>
                        {video.title}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 md:gap-6 ${isList ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {section.videos.map((video, i) => (
              <div key={i}>
                <div className="aspect-video overflow-hidden" style={{ borderRadius: 'var(--pk-radius)' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}`}
                    title={video.title ?? 'Video'}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                {video.title && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--pk-muted)' }}>
                    {video.title}
                  </p>
                )}
              </div>
            ))}
            {section.channelUrl && (
              <a
                href={section.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-video overflow-hidden flex items-center justify-center border border-white/10 hover:border-white/30 transition-colors"
                style={{ borderRadius: 'var(--pk-radius)', background: 'var(--pk-alt-bg, rgba(255,255,255,0.05))' }}
              >
                <span className="text-lg font-semibold" style={{ color: 'var(--pk-text)', fontFamily: 'var(--pk-font-heading)' }}>
                  Ver todos →
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
