import { Play } from 'lucide-react';
import type { MusicReleasesSection, MusicReleaseItem } from '../../types';
import { Carousel } from '../components/Carousel';

interface Props {
  section: MusicReleasesSection;
}

function ReleaseCard({ item, cta, wide }: { item: MusicReleaseItem; cta: string; wide?: boolean }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group ${wide ? 'flex-none w-40 snap-start' : ''} flex flex-col transition-transform hover:scale-[1.02]`}
    >
      <div
        className="relative w-full aspect-square overflow-hidden"
        style={{ borderRadius: 'var(--pk-radius)', backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <img src={item.artworkUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.35)' }}
        >
          <span
            className="flex items-center justify-center w-11 h-11 rounded-full"
            style={{ backgroundColor: 'var(--pk-primary)', color: 'var(--pk-bg)' }}
          >
            <Play size={20} fill="currentColor" />
          </span>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--pk-text)' }}>
          {item.title}
        </p>
        {item.artist && (
          <p className="text-xs truncate" style={{ color: 'var(--pk-muted)' }}>
            {item.artist}
          </p>
        )}
        <span
          className="inline-flex items-center gap-1 mt-1.5 px-3 py-1 text-xs font-semibold rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--pk-text)' }}
        >
          <Play size={11} fill="currentColor" /> {cta}
        </span>
      </div>
    </a>
  );
}

export default function MusicReleasesBlock({ section }: Props) {
  const cta = section.ctaLabel ?? 'Ouvir';
  if (section.layout === 'grid') {
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
        <div className="grid grid-cols-2 gap-4">
          {section.releases.map((item, i) => (
            <ReleaseCard key={item.url + i} item={item} cta={cta} />
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="py-6" id={section.id}>
      <Carousel title={section.title}>
        {section.releases.map((item, i) => (
          <ReleaseCard key={item.url + i} item={item} cta={cta} wide />
        ))}
      </Carousel>
    </section>
  );
}
