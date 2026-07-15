import type { ConnectorDefinition } from '@fayz-ai/core'
import { getCoursesProvider } from '@fayz-ai/courses'

// Stripe Connect modeled as a connector so it surfaces in the plugin's unified
// "Integrations" settings tab (same pattern as Financial Settings → Integrações),
// instead of a bespoke block in the General tab. The host plugin is 'courses'.
export function createStripeConnector(): ConnectorDefinition {
  return {
    id: 'stripe-connect',
    hostPluginId: 'courses',
    name: 'Stripe',
    description: 'Receba os pagamentos dos alunos; a taxa da plataforma é aplicada automaticamente.',
    icon: 'CreditCard',
    authKind: 'oauth',
    async getStatus() {
      try {
        const account = await getCoursesProvider().getCreatorAccount()
        const fee = (account.platformFeeBps / 100).toFixed(2)
        return {
          connected: !!account.stripeAccountId && account.chargesEnabled,
          detail: `Taxa da plataforma: ${fee}%`,
        }
      } catch {
        return { connected: false }
      }
    },
    async startOAuth(_redirectTo?: string): Promise<string> {
      // Stage 3 wires this to the `courses-connect-onboard` edge function and
      // returns the Stripe account-link URL to redirect to. Until then, surface
      // a clear message (ConnectorsHub toasts a thrown error's message).
      throw new Error('O onboarding do Stripe Connect é ligado na Etapa 3.')
    },
  }
}
