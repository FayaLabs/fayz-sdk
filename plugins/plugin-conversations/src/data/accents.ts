import type { Channel } from '../types'

// Solid brand hex per channel — mirrors CHANNEL_ACCENT in ../channel.ts but
// React-free so the data providers can stamp a sensible avatar accent on new
// conversations without importing the icon layer.
export const CHANNEL_ACCENT_HEX: Record<Channel, string> = {
  whatsapp: '#22c55e',
  sms: '#6366f1',
  instagram: '#ec4899',
  email: '#0ea5e9',
  webchat: '#f59e0b',
}
