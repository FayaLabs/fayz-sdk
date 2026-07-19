import type { TextSection as TextSectionType } from '../../types';
import { renderMarkdown } from '../utils';

interface Props {
  section: TextSectionType;
}

export default function TextSection({ section }: Props) {
  return (
    <section className="py-16 md:py-24 px-6" id={section.id}>
      <div className="max-w-3xl mx-auto">
        {section.title && (
          <h2
            className="text-3xl md:text-4xl font-bold mb-8"
            style={{ fontFamily: 'var(--pk-font-heading)', color: 'var(--pk-text)' }}
          >
            {section.title}
          </h2>
        )}

        <div
          className="text-base md:text-lg leading-relaxed [&_p]:mb-4 [&_strong]:font-semibold [&_em]:italic [&_a]:underline [&_a]:decoration-[var(--pk-primary)]"
          style={{ color: 'var(--pk-muted)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
        />
      </div>
    </section>
  );
}
