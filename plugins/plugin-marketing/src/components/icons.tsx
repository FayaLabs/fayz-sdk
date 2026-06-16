import React from 'react'
import {
  Search, Megaphone, Globe, Mail, Users, MousePointerClick,
  Instagram, MessageCircle, DoorOpen, Utensils, Bike, Link2,
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
