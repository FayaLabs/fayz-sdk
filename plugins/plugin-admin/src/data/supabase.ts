import type { AdminDataProvider, AdminSettingsSnapshot } from './types'

/**
 * Supabase provider — foundation stub. There is no shell-config table yet:
 * layout/moduleNav/mobileHeader/branding are still owned by FayzAppConfig at
 * build time, not a runtime-editable record. This provider exists so the
 * plugin follows the standard createSafeDataProvider(supabase, mock) seam
 * from day one; it returns the same static snapshot the mock provider does
 * until a real read/write path is wired (see README.md).
 */
export function createSupabaseAdminProvider(snapshot: AdminSettingsSnapshot): AdminDataProvider {
  return {
    async getSettings() {
      return snapshot
    },
  }
}
