import * as React from 'react'
import { KeyRound, Loader2, Clock, ShieldCheck, UserPlus } from 'lucide-react'
import { Button } from '@fayz-ai/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fayz-ai/ui'
import { useTranslation } from '../../hooks/useTranslation'
import type { AuthUser } from '../../types'

export interface TenantSecuritySettings {
  sessionTimeoutMinutes?: number
  require2FA?: boolean
  inviteOnly?: boolean
}

interface SecuritySettingsProps {
  user?: AuthUser | null
  tenantSecurity?: TenantSecuritySettings
  isAdmin?: boolean
  onResetPassword?: () => Promise<void>
  onTenantSecurityChange?: (settings: TenantSecuritySettings) => Promise<void>
}

const SESSION_TIMEOUT_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
  { label: '24 hours', value: 1440 },
  { label: 'No limit', value: 0 },
]

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
    </div>
  )
}

export function SecuritySettings({
  user,
  tenantSecurity,
  isAdmin,
  onResetPassword,
  onTenantSecurityChange,
}: SecuritySettingsProps) {
  const { t } = useTranslation()
  const [resetting, setResetting] = React.useState(false)
  const [resetSent, setResetSent] = React.useState(false)
  const [savingTenant, setSavingTenant] = React.useState(false)

  const handleResetPassword = async () => {
    if (!onResetPassword) return
    setResetting(true)
    try {
      await onResetPassword()
      setResetSent(true)
    } catch {
      // handled via toast in connected wrapper
    } finally {
      setResetting(false)
    }
  }

  const updateTenantSecurity = async (partial: Partial<TenantSecuritySettings>) => {
    if (!onTenantSecurityChange) return
    setSavingTenant(true)
    try {
      await onTenantSecurityChange({ ...tenantSecurity, ...partial })
    } catch {
      // handled via toast
    } finally {
      setSavingTenant(false)
    }
  }

  const baseClass =
    'flex h-10 w-full rounded-input border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="space-y-6">
      {/* Password reset */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.security.passwordTitle')}</CardTitle>
          <CardDescription>
            {t('settings.security.passwordSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {resetSent
                  ? t('settings.security.resetLinkSent')
                  : t('settings.security.resetLinkDescription')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={resetting || resetSent}
              onClick={handleResetPassword}
            >
              {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <KeyRound className="mr-2 h-4 w-4" />
              {resetSent ? t('settings.security.linkSent') : t('settings.security.resetPassword')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tenant security — only visible to admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('settings.security.orgSecurityTitle')}</CardTitle>
            <CardDescription>
              {t('settings.security.orgSecuritySubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <ToggleRow
              icon={<ShieldCheck className="h-4 w-4" />}
              label={t('settings.security.require2FA')}
              description={t('settings.security.require2FADescription')}
              checked={tenantSecurity?.require2FA ?? false}
              onChange={(val) => updateTenantSecurity({ require2FA: val })}
              disabled={savingTenant}
            />
            <ToggleRow
              icon={<UserPlus className="h-4 w-4" />}
              label={t('settings.security.inviteOnly')}
              description={t('settings.security.inviteOnlyDescription')}
              checked={tenantSecurity?.inviteOnly ?? true}
              onChange={(val) => updateTenantSecurity({ inviteOnly: val })}
              disabled={savingTenant}
            />

            <div className="flex items-start justify-between gap-4 py-3">
              <div className="flex gap-3">
                <div className="mt-0.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t('settings.security.sessionTimeout')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.security.sessionTimeoutDescription')}
                  </p>
                </div>
              </div>
              <select
                value={tenantSecurity?.sessionTimeoutMinutes ?? 0}
                onChange={(e) =>
                  updateTenantSecurity({ sessionTimeoutMinutes: Number(e.target.value) })
                }
                disabled={savingTenant}
                className={`${baseClass} w-36`}
              >
                {SESSION_TIMEOUT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
