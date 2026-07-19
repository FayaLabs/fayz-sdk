import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { BioPage as BioPageType } from '../types';
import { getBrandingVars } from './utils';
import BioPageRenderer from './BioPageRenderer';
import { useLinkInBio } from './context';

/**
 * Public bio-page route component. Reads `:slug` from the URL, resolves the page
 * from the data provider, applies SEO + dynamic Google Fonts + branding CSS vars,
 * and renders the block list. Mounted by the plugin manifest as a guard:'public'
 * route (default path `/p/:slug`).
 */
export default function BioPage() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, poweredBy, titleSuffix } = useLinkInBio();
  const [page, setPage] = useState<BioPageType | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!slug) {
      setResolved(true);
      return;
    }
    let cancelled = false;
    setResolved(false);
    provider
      .getBySlug(slug)
      .then((pk) => {
        if (cancelled) return;
        setPage(pk);
        setResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, provider]);

  // Set document title & load custom fonts
  useEffect(() => {
    if (!page) return;

    // SEO
    document.title = page.seo.title ?? `${page.identity.name} | ${titleSuffix}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && page.seo.description) {
      metaDesc.setAttribute('content', page.seo.description);
    }

    // Dynamic Google Fonts loading
    const fontsToLoad: string[] = [];
    const { fontHeading, fontBody } = page.branding;
    if (fontHeading && !fontHeading.includes('Space Grotesk')) {
      const family = fontHeading.replace(/['"]/g, '').split(',')[0].trim();
      fontsToLoad.push(family);
    }
    if (fontBody && !fontBody.includes('DM Sans')) {
      const family = fontBody.replace(/['"]/g, '').split(',')[0].trim();
      fontsToLoad.push(family);
    }

    const linkElements: HTMLLinkElement[] = [];
    if (fontsToLoad.length > 0) {
      const families = fontsToLoad.map((f) => `family=${f.replace(/\s/g, '+')}:wght@400;600;700`).join('&');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
      document.head.appendChild(link);
      linkElements.push(link);
    }

    return () => {
      linkElements.forEach((el) => el.remove());
    };
  }, [page, titleSuffix]);

  if (!resolved) {
    return (
      <div className="dark fixed inset-0 flex items-center justify-center bg-background text-foreground">
        <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse" aria-label="carregando" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="dark fixed inset-0 flex items-center justify-center bg-background text-foreground">
        <div className="text-center px-6">
          <h1 className="text-large font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            404
          </h1>
          <p className="text-foreground-secondary mb-6">Página não encontrada.</p>
          <a
            href="/"
            className="text-sm underline underline-offset-4 text-foreground-secondary hover:text-foreground transition-colors"
          >
            voltar ao início
          </a>
        </div>
      </div>
    );
  }

  const brandingVars = getBrandingVars(page.branding);

  return (
    <div
      className="fixed inset-0 overflow-y-auto overflow-x-hidden"
      style={{
        ...brandingVars,
        backgroundColor: 'var(--pk-bg)',
        color: 'var(--pk-text)',
        fontFamily: 'var(--pk-font-body)',
      } as React.CSSProperties}
    >
      <BioPageRenderer page={page} poweredBy={poweredBy} />
    </div>
  );
}
