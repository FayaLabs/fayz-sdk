import React from 'react'
import { MessageSquare, Phone, Instagram, Mail, Globe } from 'lucide-react'
import { CHANNEL_LABELS, type Channel } from './types'

// ---------------------------------------------------------------------------
// Shared channel visuals — one source of truth for the icon + accent color of
// each channel, reused by the conversation list, thread header and contact
// panel. Keeps the omni-channel inbox visually consistent.
// ---------------------------------------------------------------------------

export const CHANNEL_ICON: Record<Channel, React.ComponentType<{ className?: string }>> = {
  sms: Phone,
  whatsapp: MessageSquare,
  instagram: Instagram,
  email: Mail,
  webchat: Globe,
}

export interface ChannelAccent {
  /** Solid brand color (hex) — bubbles, dots, header chips. */
  color: string
  /** Soft tinted background classes for badges. */
  badge: string
}

export const CHANNEL_ACCENT: Record<Channel, ChannelAccent> = {
  whatsapp: { color: '#22c55e', badge: 'bg-[#22c55e]/12 text-[#15803d] dark:text-[#4ade80]' },
  sms: { color: '#6366f1', badge: 'bg-[#6366f1]/12 text-[#4338ca] dark:text-[#a5b4fc]' },
  instagram: { color: '#ec4899', badge: 'bg-[#ec4899]/12 text-[#be185d] dark:text-[#f9a8d4]' },
  email: { color: '#0ea5e9', badge: 'bg-[#0ea5e9]/12 text-[#0369a1] dark:text-[#7dd3fc]' },
  webchat: { color: '#f59e0b', badge: 'bg-[#f59e0b]/12 text-[#b45309] dark:text-[#fcd34d]' },
}

export { CHANNEL_LABELS }
