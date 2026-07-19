import { useState } from 'react';
import type { GallerySection as GallerySectionType, BioMediaItem } from '../../types';

interface Props {
  section: GallerySectionType;
}

function isInstagramEmbed(item: BioMediaItem) {
  return item.url.includes('instagram.com');
}

function getInstagramEmbedUrl(url: string) {
  // Convert instagram reel/post URL to embed URL
  const match = url.match(/instagram\.com\/(reel|p)\/([^/?]+)/);
  if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
  return url;
}

function MediaItem({ item, index, cols, isFeatured, onImageClick }: {
  item: BioMediaItem;
  index: number;
  cols: number;
  isFeatured: boolean;
  onImageClick: (i: number) => void;
}) {
  if (isInstagramEmbed(item)) {
    return (
      <div
        className={`overflow-hidden ${isFeatured && index === 0 ? 'col-span-2' : ''}`}
        style={{ borderRadius: 'var(--pk-radius)' }}
      >
        <iframe
          src={getInstagramEmbedUrl(item.url)}
          className="w-full border-0"
          style={{ minHeight: cols <= 2 ? '500px' : '420px' }}
          loading="lazy"
          // @ts-expect-error React wants lowercase for custom DOM attributes
          allowtransparency="true"
          allow="encrypted-media"
          title={item.alt ?? 'Instagram'}
        />
      </div>
    );
  }

  return (
    <img
      src={item.url}
      alt={item.alt ?? ''}
      className={`w-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${
        isFeatured && index === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
      }`}
      style={{ borderRadius: 'var(--pk-radius)' }}
      loading="lazy"
      onClick={() => onImageClick(index)}
    />
  );
}

export default function GallerySection({ section }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const cols = section.columns ?? 3;
  const isFeatured = section.layout === 'featured-grid';
  const isCarousel = section.layout === 'carousel';

  // Only images for lightbox navigation
  const imageItems = section.media.filter((m) => !isInstagramEmbed(m));

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

        {isCarousel ? (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 scrollbar-hide">
            {section.media.map((item, i) => (
              <div key={i} className="flex-none w-72 md:w-96 snap-center">
                <MediaItem item={item} index={i} cols={cols} isFeatured={false} onImageClick={setLightboxIdx} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-3 md:gap-4 ${
              isFeatured
                ? 'grid-cols-2'
                : cols === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : cols === 4
                    ? 'grid-cols-2 md:grid-cols-4'
                    : 'grid-cols-2 md:grid-cols-3'
            }`}
          >
            {section.media.map((item, i) => (
              <MediaItem key={i} item={item} index={i} cols={cols} isFeatured={isFeatured} onImageClick={setLightboxIdx} />
            ))}
          </div>
        )}

        {/* Lightbox — images only */}
        {lightboxIdx !== null && imageItems[lightboxIdx] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxIdx(null)}
          >
            <button
              className="absolute top-4 right-4 text-white text-3xl font-light hover:opacity-70 z-10"
              onClick={() => setLightboxIdx(null)}
            >
              &times;
            </button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl font-light hover:opacity-70 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((lightboxIdx - 1 + imageItems.length) % imageItems.length);
              }}
            >
              &#8249;
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl font-light hover:opacity-70 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((lightboxIdx + 1) % imageItems.length);
              }}
            >
              &#8250;
            </button>
            <img
              src={imageItems[lightboxIdx].url}
              alt={imageItems[lightboxIdx].alt ?? ''}
              className="max-h-[85vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </section>
  );
}
