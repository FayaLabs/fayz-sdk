import type { AdminDataProvider, AdminSettingsSnapshot } from './types'

/**
 * Mock provider — returns the statically resolved shell-config snapshot
 * (from plugin options / FayzAppConfig defaults). No in-memory mutation:
 * this plugin doesn't write settings yet.
 */
export function createMockAdminProvider(snapshot: AdminSettingsSnapshot): AdminDataProvider {
  return {
    async getSettings() {
      return snapshot
    },
  }
}
