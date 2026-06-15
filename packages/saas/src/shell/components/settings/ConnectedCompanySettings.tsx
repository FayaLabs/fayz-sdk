import { CompanySettings } from './CompanySettings'
import { useOrganizationStore } from '../../stores/organization.store'
import { useOrgAdapterOptional } from '../../lib/org-context'
import { toast } from '../notifications/ToastProvider'
import type { Tenant, TenantSettings } from '../../types'

function toTenantSettings(settings: unknown): TenantSettings {
  const source = (settings && typeof settings === 'object' ? settings : {}) as Partial<TenantSettings>
  const branding = (source.branding && typeof source.branding === 'object' ? source.branding : {}) as TenantSettings['branding']

  return {
    timezone: source.timezone ?? 'America/Sao_Paulo',
    currency: source.currency ?? 'BRL',
    locale: source.locale ?? 'pt-BR',
    branding: {
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
    },
  }
}

export function ConnectedCompanySettings() {
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)
  const adapter = useOrgAdapterOptional()
  // Map Organization to Tenant shape for the component
  const tenant: Tenant | null = currentOrg
    ? {
        id: currentOrg.id,
        name: currentOrg.name,
        slug: currentOrg.slug,
        logoUrl: currentOrg.logoUrl,
        plan: currentOrg.plan ?? 'free',
        settings: toTenantSettings(currentOrg.settings),
        createdAt: currentOrg.createdAt,
        updatedAt: currentOrg.updatedAt,
      }
    : null

  const handleSave = async (data: { name: string; timezone: string; currency: string }) => {
    if (!adapter || !currentOrg) return

    try {
      const currentSettings = toTenantSettings(currentOrg.settings)
      const updated = await adapter.updateOrg(currentOrg.id, {
        name: data.name,
        settings: {
          ...currentSettings,
          timezone: data.timezone,
          currency: data.currency,
        },
      })
      setCurrentOrg(updated)
      toast.success('Settings saved')
    } catch (err: any) {
      toast.error('Failed to save', { description: err?.message })
    }
  }

  return <CompanySettings tenant={tenant} onSave={handleSave} />
}
