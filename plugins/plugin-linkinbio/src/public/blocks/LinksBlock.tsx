import { ChevronRight } from 'lucide-react';
import type { LinksSection, LinkCardItem } from '../../types';
import { PlatformIcon } from '../components/PlatformIcon';

interface Props {
  section: LinksSection;
}

function LinkCard({ item }: { item: LinkCardItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 p-3 transition-all duration-200 hover:scale-[1.015] active:scale-[0.99]"
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--pk-radius)',
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center w-12 h-12 overflow-hidden"
        style={{ borderRadius: 'calc(var(--pk-radius) - 4px)', backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <PlatformIcon platform={item.icon ?? 'custom'} size={20} style={{ color: 'var(--pk-primary)' }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--pk-text)' }}>
            {item.title}
          </span>
          {item.badge && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--pk-primary)', color: 'var(--pk-bg)' }}
            >
              {item.badge}
            </span>
          )}
        </div>
        {item.subtitle && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--pk-muted)' }}>
            {item.subtitle}
          </p>
        )}
      </div>
      <ChevronRight
        size={18}
        className="shrink-0 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all"
        style={{ color: 'var(--pk-text)' }}
      />
    </a>
  );
}

export default function LinksBlock({ section }: Props) {
  const isGrid = section.layout === 'grid';
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
      <div className={isGrid ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        {section.links.map((item, i) => (
          <LinkCard key={item.url + i} item={item} />
        ))}
      </div>
    </section>
  );
}
