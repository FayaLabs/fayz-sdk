import type { CSSProperties, ComponentType } from 'react';
import {
  SiInstagram,
  SiYoutube,
  SiSoundcloud,
  SiTiktok,
  SiSpotify,
  SiWhatsapp,
  SiApplemusic,
  SiBandcamp,
  SiFacebook,
  SiX,
  SiTelegram,
  SiBeatport,
  SiGoogledrive,
  SiMixcloud,
} from 'react-icons/si';
import { Globe, Mail, ExternalLink } from 'lucide-react';

type IconProps = { size?: number | string; style?: CSSProperties; className?: string };

// Real brand glyphs for social/platform links (react-icons → simple-icons set).
const BRAND: Record<string, ComponentType<IconProps>> = {
  instagram: SiInstagram,
  youtube: SiYoutube,
  soundcloud: SiSoundcloud,
  tiktok: SiTiktok,
  spotify: SiSpotify,
  whatsapp: SiWhatsapp,
  'apple-music': SiApplemusic,
  bandcamp: SiBandcamp,
  facebook: SiFacebook,
  twitter: SiX,
  telegram: SiTelegram,
  beatport: SiBeatport,
  mixcloud: SiMixcloud,
  drive: SiGoogledrive,
  email: Mail,
  website: Globe,
};

/** Renders the real brand icon for a platform, falling back to a generic link glyph. */
export function PlatformIcon({
  platform,
  size = 20,
  style,
  className,
}: {
  platform: string;
  size?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const Icon = BRAND[platform] ?? ExternalLink;
  return <Icon size={size} style={style} className={className} />;
}
