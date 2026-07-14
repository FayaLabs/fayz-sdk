import React from 'react'
import {
  Search, Megaphone, Globe, Mail, Users, MousePointerClick,
  Instagram, MessageCircle, DoorOpen, Utensils, Bike, Link2,
  Youtube, Facebook, Linkedin, Twitter, Music2, Pin, AtSign,
} from 'lucide-react'

// Channel icon names referenced by presets → lucide components. Falls back to
// a generic link icon for anything unmapped.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Search, Megaphone, Globe, Mail, Users, MousePointerClick,
  Instagram, MessageCircle, DoorOpen, Utensils, Bike,
}

export function ChannelIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Link2
  return <Icon className={className} />
}

// Platform icons for the content planner. Lucide has no TikTok / Pinterest /
// Threads glyphs — Music2 / Pin / AtSign are the conventional stand-ins.
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  facebook: Facebook,
  linkedin: Linkedin,
  x: Twitter,
  pinterest: Pin,
  threads: AtSign,
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Link2
  return <Icon className={className} />
}
