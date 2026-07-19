import { Instagram, Music, Youtube, Globe, Mail, Phone, Facebook, Twitter } from 'lucide-react';
import type { BioBranding } from '../types';

// Lightweight markdown → HTML renderer (bold, italic, links, paragraphs)
export function renderMarkdown(md: string): string {
  return md
    .split(/\n\n+/)
    .map((block) => {
      const html = block
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n/g, '<br />');
      return `<p>${html}</p>`;
    })
    .join('');
}

export const platformColors: Record<string, string> = {
  instagram: '#E4405F',
  spotify: '#1DB954',
  soundcloud: '#FF5500',
  youtube: '#FF0000',
  tiktok: '#000000',
  whatsapp: '#25D366',
  email: '#EA4335',
  twitter: '#1DA1F2',
  facebook: '#1877F2',
  bandcamp: '#629AA9',
  mixcloud: '#5000FF',
  beatport: '#94D500',
  'apple-music': '#FC3C44',
  deezer: '#FEAA2D',
  telegram: '#0088CC',
  website: '#888888',
  custom: '#888888',
};

export const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  email: 'Email',
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  bandcamp: 'Bandcamp',
  mixcloud: 'Mixcloud',
  beatport: 'Beatport',
  'apple-music': 'Apple Music',
  deezer: 'Deezer',
  telegram: 'Telegram',
  website: 'Website',
  custom: 'Link',
};

export const platformIconMap: Record<string, typeof Instagram> = {
  instagram: Instagram,
  spotify: Music,
  soundcloud: Music,
  youtube: Youtube,
  tiktok: Music,
  whatsapp: Phone,
  email: Mail,
  twitter: Twitter,
  facebook: Facebook,
  bandcamp: Music,
  mixcloud: Music,
  beatport: Music,
  'apple-music': Music,
  deezer: Music,
  telegram: Globe,
  website: Globe,
  custom: Globe,
};

export const borderRadiusMap: Record<string, string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '9999px',
};

export function getBrandingVars(branding: BioBranding): Record<string, string> {
  return {
    '--pk-primary': branding.primaryColor,
    '--pk-secondary': branding.secondaryColor,
    '--pk-accent': branding.accentColor,
    '--pk-bg': branding.backgroundColor,
    '--pk-text': branding.textColor,
    '--pk-muted': branding.mutedTextColor,
    '--pk-radius': borderRadiusMap[branding.borderRadius ?? 'md'],
    '--pk-font-heading': branding.fontHeading ?? "'Space Grotesk', sans-serif",
    '--pk-font-body': branding.fontBody ?? "'DM Sans', sans-serif",
    '--pk-alt-bg': branding.sectionAltBg ?? branding.backgroundColor,
    '--pk-alt-bg2': branding.sectionAltBg2 ?? branding.backgroundColor,
  };
}
