import React from 'react'
import { WifiOff } from 'lucide-react'
import { getSupabaseClientOptional } from '../../lib/supabase'
import { useTranslation } from '../../hooks/useTranslation'

export function MockModeBanner() {
  const { t } = useTranslation()

  if (getSupabaseClientOptional()) return null

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-warning">
      <WifiOff className="h-3 w-3 shrink-0" />
      <span>{t('app.mockMode.banner')}</span>
    </div>
  )
}
