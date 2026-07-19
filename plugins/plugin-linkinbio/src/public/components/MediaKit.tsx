import { useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, Copy, Check, FileText, ExternalLink } from 'lucide-react';
import type { BioPage, BioMediaItem } from '../../types';
import { getBrandingVars } from '../utils';

interface Asset {
  label: string;
  url: string;
  kind: 'image' | 'logo' | 'doc' | 'audio' | 'link';
}

/** Derive downloadable assets from the page (logo, photos, bio text) + explicit mediaKit. */
function derive(page: BioPage): { images: Asset[]; bioText: string; extras: Asset[]; driveUrl?: string } {
  const seen = new Set<string>();
  const images: Asset[] = [];
  const pushImg = (label: string, url: string, kind: Asset['kind'] = 'image') => {
    if (!url || seen.has(url) || !url.startsWith('/')) return; // only local (own) assets
    seen.add(url);
    images.push({ label, url, kind });
  };

  if (page.branding.logoUrl) pushImg('Logo', page.branding.logoUrl, 'logo');

  let bioText = '';
  for (const s of page.sections) {
    if (s.type === 'profile-header' && s.imageUrl) pushImg('Foto de capa', s.imageUrl);
    if (s.type === 'hero' && s.backgroundImageUrl) pushImg('Foto de capa', s.backgroundImageUrl);
    if (s.type === 'gallery') s.media.forEach((m: BioMediaItem, i: number) => m.type === 'image' && pushImg(`Foto ${i + 1}`, m.url));
    if (s.type === 'bio' || s.type === 'text') {
      if (s.content) bioText += `${s.title ? `## ${s.title}\n\n` : ''}${s.content}\n\n`;
      if (s.type === 'bio' && s.imageUrl) pushImg('Foto', s.imageUrl);
    }
  }

  const extras = (page.mediaKit?.assets ?? []).map(
    (a: { label: string; url: string; kind?: Asset['kind'] }): Asset => ({ label: a.label, url: a.url, kind: a.kind ?? 'link' }),
  );

  return { images, bioText: bioText.trim(), extras, driveUrl: page.mediaKit?.driveUrl };
}

function fileName(url: string, fallback: string): string {
  const base = url.split('/').pop()?.split('?')[0];
  return base && base.includes('.') ? base : fallback;
}

export function MediaKit({ page, variant = 'inline' }: { page: BioPage; variant?: 'inline' | 'fab' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { images, bioText, extras, driveUrl } = useMemo(() => derive(page), [page]);

  if (!images.length && !bioText && !extras.length && !driveUrl) return null;

  const copyBio = async () => {
    try {
      await navigator.clipboard.writeText(bioText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadBio = () => {
    const blob = new Blob([bioText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.identity.slug || 'bio'}-bio.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        ...(getBrandingVars(page.branding) as CSSProperties),
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        fontFamily: 'var(--pk-font-body)',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ backgroundColor: 'var(--pk-bg)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
          style={{ backgroundColor: 'var(--pk-bg)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <Download size={18} style={{ color: 'var(--pk-primary)' }} />
            <h3 className="text-base font-bold" style={{ color: 'var(--pk-text)', fontFamily: 'var(--pk-font-heading)' }}>
              Mídia Kit
            </h3>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--pk-text)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Full kit (Drive) */}
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl transition-transform hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--pk-primary)', color: 'var(--pk-bg)' }}
            >
              <ExternalLink size={18} />
              <span className="text-sm font-semibold">Abrir kit completo (Drive)</span>
            </a>
          )}

          {/* Bio */}
          {bioText && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--pk-muted)' }}>
                Bio / Release
              </h4>
              <p
                className="text-sm leading-relaxed max-h-32 overflow-y-auto p-3 rounded-xl"
                style={{ color: 'var(--pk-muted)', backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                {bioText.replace(/[*#]/g, '')}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={copyBio}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--pk-text)' }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={downloadBio}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--pk-text)' }}
                >
                  <FileText size={13} /> .txt
                </button>
              </div>
            </section>
          )}

          {/* Photos + logo */}
          {images.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--pk-muted)' }}>
                Fotos & Logo
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <a
                    key={img.url}
                    href={img.url}
                    download={fileName(img.url, `${page.identity.slug}-${img.label}`)}
                    className="group relative aspect-square overflow-hidden rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                    title={`Baixar ${img.label}`}
                  >
                    <img
                      src={img.url}
                      alt={img.label}
                      className={`w-full h-full ${img.kind === 'logo' ? 'object-contain p-3' : 'object-cover'}`}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.45)' }}
                    >
                      <Download size={20} style={{ color: '#fff' }} />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Extra resources */}
          {extras.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--pk-muted)' }}>
                Recursos
              </h4>
              <div className="flex flex-col gap-2">
                {extras.map((a) => (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={a.kind !== 'link' ? fileName(a.url, a.label) : undefined}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--pk-text)' }}
                  >
                    {a.kind === 'link' ? <ExternalLink size={16} /> : <FileText size={16} />}
                    <span className="text-sm font-medium">{a.label}</span>
                    <Download size={15} className="ml-auto opacity-50" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  const isFab = variant === 'fab';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Baixar mídia kit"
        title="Mídia Kit"
        className={`flex items-center justify-center rounded-full transition-transform hover:scale-110 ${isFab ? 'w-12 h-12' : 'w-11 h-11'}`}
        style={
          isFab
            ? {
                color: 'var(--pk-primary)',
                border: '1.5px solid var(--pk-primary)',
                backgroundColor: 'color-mix(in srgb, var(--pk-bg) 70%, transparent)',
                backdropFilter: 'blur(6px)',
              }
            : { backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--pk-text)' }
        }
      >
        <Download size={isFab ? 20 : 19} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(modal, document.body)}
    </>
  );
}
