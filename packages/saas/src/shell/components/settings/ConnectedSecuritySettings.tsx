import { SecuritySettings } from './SecuritySettings'
import type { TenantSecuritySettings } from './SecuritySettings'
import { useAuthStore } from '../../stores/auth.store'
import { useOrganizationStore } from '../../stores/organization.store'
import { useAuthAdapterOptional } from '../../lib/auth-context'
// Native org adapter — see ConnectedCompanySettings. The shell org-context
// provider is never mounted, so the old import yielded a null adapter (no-op save).
import { useOrgAdapterOptional } from '../../../org'
import { toast } from '../notifications/ToastProvider'

export function ConnectedSecuritySettings() {
  const user = useAuthStore((s) => s.user)
  const authAdapter = useAuthAdapterOptional()
  const orgAdapter = useOrgAdapterOptional()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)

  const settings = (currentOrg?.settings ?? {}) as Record<string, unknown>
  const tenantSecurity = (settings.security ?? {}) as TenantSecuritySettings

  // Determine if current user is admin (owner/admin role)
  const members = useOrganizationStore((s) => s.members)
  const currentMember = members.find((m) => m.userId === user?.id)
  const isAdmin = currentMember?.profileName?.toLowerCase() === 'owner' ||
    currentMember?.profileName?.toLowerCase() === 'admin'

  const handleResetPassword = async () => {
    if (!authAdapter || !user?.email) return
    try {
      await authAdapter.resetPassword(user.email)
      toast.success('Password reset link sent', { description: `Check ${user.email} for the reset link.` })
    } catch (err: any) {
      toast.error('Failed to send reset link', { description: err?.message })
      throw err
    }
  }

  const handleTenantSecurityChange = async (security: TenantSecuritySettings) => {
    if (!orgAdapter || !currentOrg) return
    try {
      const updated = await orgAdapter.updateOrg(currentOrg.id, {
        settings: { ...settings, security },
      })
      setCurrentOrg(updated)
      toast.success('Security settings updated')
    } catch (err: any) {
      toast.error('Failed to update security settings', { description: err?.message })
      throw err
    }
  }

  return (
    <SecuritySettings
      user={user as any}
      tenantSecurity={tenantSecurity}
      isAdmin={isAdmin}
      onResetPassword={handleResetPassword}
      onTenantSecurityChange={orgAdapter ? handleTenantSecurityChange : undefined}
    />
  )
}
