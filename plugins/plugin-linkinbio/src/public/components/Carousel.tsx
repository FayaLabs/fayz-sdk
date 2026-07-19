import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Komi-style horizontal collection: a section title with prev/next controls and
 * a snap-scrolling track. Mobile-first — the track scrolls by touch and the
 * arrows nudge it by ~80% of the viewport. Arrows disable at the track ends.
 */
export function Carousel({ title, children }: { title?: string; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrowStyle = (disabled: boolean) => ({
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: 'var(--pk-text)',
    opacity: disabled ? 0.25 : 1,
    borderRadius: '9999px',
  });

  return (
    <div>
      {(title || true) && (
        <div className="flex items-center justify-between mb-4 px-1">
          {title && (
            <h2
              className="text-xl md:text-2xl font-bold"
              style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
            >
              {title}
            </h2>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => nudge(-1)}
              disabled={atStart}
              className="flex items-center justify-center w-9 h-9 transition-opacity"
              style={arrowStyle(atStart)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => nudge(1)}
              disabled={atEnd}
              className="flex items-center justify-center w-9 h-9 transition-opacity"
              style={arrowStyle(atEnd)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1"
      >
        {children}
      </div>
    </div>
  );
}
