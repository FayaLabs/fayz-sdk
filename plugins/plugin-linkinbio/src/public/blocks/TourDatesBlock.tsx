import { MapPin } from 'lucide-react';
import type { TourDatesSection, TourDateItem } from '../../types';

interface Props {
  section: TourDatesSection;
}

const MONTHS_PT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function parseDate(date: string): { month: string; day: string; year: string } {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const monthIdx = Math.min(11, Math.max(0, parseInt(m[2], 10) - 1));
    return { month: MONTHS_PT[monthIdx], day: String(parseInt(m[3], 10)), year: m[1] };
  }
  return { month: '', day: date, year: '' };
}

function DateRow({ item, cta }: { item: TourDateItem; cta: string }) {
  const { month, day, year } = parseDate(item.date);
  const hasLink = !!item.url;
  const label = hasLink ? cta : item.soldOut ? 'Esgotado' : 'Em breve';
  const Tag = hasLink ? 'a' : 'div';
  return (
    <Tag
      {...(hasLink ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`flex items-center gap-4 p-3 transition-all duration-200 ${hasLink ? 'hover:scale-[1.01]' : 'cursor-default'}`}
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--pk-radius)',
      }}
    >
      <div
        className="shrink-0 flex flex-col items-center justify-center w-14 h-16"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'calc(var(--pk-radius) - 4px)' }}
      >
        <span className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--pk-primary)' }}>{month}</span>
        <span className="text-xl font-bold leading-none" style={{ color: 'var(--pk-text)', fontFamily: 'var(--pk-font-heading)' }}>{day}</span>
        <span className="text-[10px] opacity-60" style={{ color: 'var(--pk-muted)' }}>{year}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--pk-text)' }}>{item.venue}</p>
        {item.city && (
          <p className="text-xs truncate flex items-center gap-1 mt-0.5" style={{ color: 'var(--pk-muted)' }}>
            <MapPin size={11} /> {item.city}
          </p>
        )}
      </div>
      <span
        className="shrink-0 px-4 py-1.5 text-xs font-semibold rounded-full"
        style={
          hasLink
            ? { backgroundColor: 'var(--pk-primary)', color: 'var(--pk-bg)' }
            : { backgroundColor: 'transparent', color: 'var(--pk-muted)', border: '1px solid rgba(255,255,255,0.12)' }
        }
      >
        {label}
      </span>
    </Tag>
  );
}

export default function TourDatesBlock({ section }: Props) {
  const cta = section.ctaLabel ?? 'Ingressos';
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
      <div className="flex flex-col gap-3">
        {section.dates.map((item, i) => (
          <DateRow key={item.date + item.venue + i} item={item} cta={cta} />
        ))}
      </div>
    </section>
  );
}
