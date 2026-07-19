import { ExternalLink } from 'lucide-react';
import type { SocialLinksSection as SocialLinksSectionType } from '../../types';
import { platformColors, platformLabels } from '../utils';
import { PlatformIcon } from '../components/PlatformIcon';

interface Props {
  section: SocialLinksSectionType;
}

export default function SocialLinksSection({ section }: Props) {
  const layout = section.layout ?? 'buttons';

  return (
    <section className="py-16 md:py-24 px-6" id={section.id}>
      <div className="max-w-xl mx-auto">
        {section.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-10 text-center"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {section.title}
          </h2>
        )}

        {layout === 'icons' && (
          <div className="flex flex-wrap justify-center gap-5">
            {section.links.map((link) => {
              const color = platformColors[link.platform];
              return (
                <a
                  key={link.platform + link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg"
                  style={{
                    backgroundColor: color + '15',
                    boxShadow: `0 0 0 1px ${color}25`,
                  }}
                  title={link.label ?? platformLabels[link.platform]}
                >
                  <PlatformIcon platform={link.platform} size={26} style={{ color }} />
                </a>
              );
            })}
          </div>
        )}

        {layout === 'buttons' && (
          <div className="flex flex-col gap-3">
            {section.links.map((link) => {
              const color = platformColors[link.platform];
              return (
                <a
                  key={link.platform + link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-5 px-6 py-4 font-medium transition-all duration-300 hover:scale-[1.02] overflow-hidden"
                  style={{
                    backgroundColor: color + '10',
                    color: 'var(--pk-text)',
                    borderRadius: 'var(--pk-radius)',
                    border: `1px solid ${color}30`,
                  }}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(135deg, ${color}18, transparent 60%)` }}
                  />

                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: color + '20' }}
                  >
                    <PlatformIcon platform={link.platform} size={20} style={{ color }} />
                  </div>

                  <span className="relative z-10 text-base">{link.label ?? platformLabels[link.platform]}</span>

                  <ExternalLink
                    size={16}
                    className="relative z-10 ml-auto opacity-0 group-hover:opacity-50 transition-opacity duration-300"
                    style={{ color: 'var(--pk-text)' }}
                  />
                </a>
              );
            })}
          </div>
        )}

        {layout === 'list' && (
          <div className="space-y-1">
            {section.links.map((link) => {
              const color = platformColors[link.platform];
              return (
                <a
                  key={link.platform + link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 py-4 px-3 transition-all duration-200 hover:bg-white/5 rounded-lg"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                    style={{ backgroundColor: color + '18' }}
                  >
                    <PlatformIcon platform={link.platform} size={18} style={{ color }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--pk-text)' }}>
                    {link.label ?? platformLabels[link.platform]}
                  </span>
                  <ExternalLink
                    size={14}
                    className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity"
                    style={{ color: 'var(--pk-text)' }}
                  />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
