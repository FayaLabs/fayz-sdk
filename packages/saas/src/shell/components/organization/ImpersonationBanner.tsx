import * as React from 'react'
import { Eye, X } from 'lucide-react'
import { usePermissionsStore } from '../../stores/permissions.store'
import { useTranslation } from '../../hooks/useTranslation'

export function ImpersonationBanner() {
  const isImpersonating = usePermissionsStore((s) => s.isImpersonating)
  const impersonatedProfile = usePermissionsStore((s) => s.impersonatedProfile)
  const stopImpersonation = usePermissionsStore((s) => s.stopImpersonation)
  const { t } = useTranslation()

  if (!isImpersonating || !impersonatedProfile) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] flex items-center justify-center gap-3 bg-warning px-4 py-1.5 text-sm font-medium text-amber-950 shadow-sm">
      <Eye className="h-3.5 w-3.5" />
      <span>
        {t('organization.permissions.previewingAs')}: <strong>{impersonatedProfile.name}</strong>
      </span>
      <button
        onClick={stopImpersonation}
        className="ml-2 inline-flex items-center gap-1 rounded-md bg-warning/30 px-2 py-0.5 text-xs font-semibold hover:bg-warning/50 transition-colors"
      >
        <X className="h-3 w-3" />
        {t('organization.permissions.exitPreview')}
      </button>
    </div>
  )
}
