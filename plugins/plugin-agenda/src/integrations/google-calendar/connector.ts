// Google Calendar connector descriptor (control-plane metadata).
//
// Declares the connector against the SDK integration spine so the platform can
// reason about what it syncs. The actual data-plane verbs run in the
// google-calendar-sync edge function; this is the typed contract + capabilities.
import type { Connector } from '@fayz-ai/core'

export const googleCalendarConnector: Connector = {
  id: 'google-calendar',
  provider: 'google',
  pluginId: 'agenda',
  authKind: 'oauth',
  capabilities: [
    {
      entity: 'booking',
      direction: 'bidirectional',
      triggers: ['on-write', 'scheduled', 'webhook'],
    },
  ],
}
