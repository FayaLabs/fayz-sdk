// ---------------------------------------------------------------------------
// Admin Plugin — Data Provider
// ---------------------------------------------------------------------------
// A snapshot of the app's shell config, resolved once at plugin creation. This
// is a read-only reflection today, not a persisted, editable record — see the
// module doc comment in ../types.ts.
// ---------------------------------------------------------------------------

export interface AdminSettingsSnapshot {
  layout: 'sidebar' | 'topbar' | 'minimal'
  moduleNav: 'rail' | 'tabs'
  mobileHeader: 'minimal' | 'transparent' | 'hidden'
  navTransition: 'slide' | 'fade' | 'none'
  orgSettings: boolean
  branding: boolean
}

export interface AdminDataProvider {
  getSettings(): Promise<AdminSettingsSnapshot>
}
