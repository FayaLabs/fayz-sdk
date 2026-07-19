import type { StatsSection as StatsSectionType } from '../../types';

interface Props {
  section: StatsSectionType;
}

export default function StatsSection({ section }: Props) {
  const isGrid = section.layout === 'grid';

  return (
    <section className="py-16 md:py-24 px-6" id={section.id}>
      <div className="max-w-4xl mx-auto">
        {section.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {section.title}
          </h2>
        )}

        <div
          className={
            isGrid
              ? 'grid grid-cols-2 md:grid-cols-4 gap-6'
              : 'flex flex-wrap justify-center gap-8 md:gap-12'
          }
        >
          {section.stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div
                className="text-3xl md:text-4xl font-bold mb-1"
                style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-primary)' }}
              >
                {stat.value}
              </div>
              <div className="text-sm" style={{ color: 'var(--pk-muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
