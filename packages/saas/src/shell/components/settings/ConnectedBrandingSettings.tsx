import { BrandingSettings } from './BrandingSettings'
import { useOrganizationStore } from '../../stores/organization.store'
import { toast } from '../notifications/ToastProvider'
import { getSupabaseClient } from '../../lib/supabase'
import type { TenantSettings } from '../../types'

export function ConnectedBrandingSettings() {
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)

  const handleSave = async (
    branding: TenantSettings['branding'],
    assets?: { logoFile?: File | null; faviconFile?: File | null },
  ) => {
    if (!currentOrg) return

    try {
      const supabase = getSupabaseClient()
      let nextBranding = { ...branding }

      if (assets?.logoFile) {
        const ext = assets.logoFile.name.split('.').pop() ?? 'png'
        const path = `branding/${currentOrg.id}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, assets.logoFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        nextBranding.logoUrl = data.publicUrl
      }

      if (assets?.faviconFile) {
        const ext = assets.faviconFile.name.split('.').pop() ?? 'png'
        const path = `branding/${currentOrg.id}/favicon.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, assets.faviconFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        nextBranding.faviconUrl = data.publicUrl
      }

      const currentSettings = (currentOrg.settings ?? {}) as Record<string, unknown>
      const settings = {
        ...currentSettings,
        branding: nextBranding,
      }

      const { data: updatedTenant, error: updateError } = await supabase
        .from('tenants')
        .update({
          settings,
          logo_url: nextBranding.logoUrl ?? currentOrg.logoUrl ?? null,
        })
        .eq('id', currentOrg.id)
        .select()
        .single()

      if (updateError) throw updateError

      setCurrentOrg({
        ...currentOrg,
        logoUrl: updatedTenant.logo_url ?? undefined,
        settings: updatedTenant.settings ?? settings,
        updatedAt: updatedTenant.updated_at ?? currentOrg.updatedAt,
      })

      toast.success('Branding saved')
    } catch (err: any) {
      toast.error('Failed to save branding', { description: err?.message })
    }
  }

  const currentSettings = (currentOrg?.settings ?? {}) as Partial<TenantSettings>

  return (
    <BrandingSettings
      branding={currentSettings.branding}
      onSave={handleSave}
    />
  )
}
