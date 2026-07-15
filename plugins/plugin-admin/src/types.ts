// ---------------------------------------------------------------------------
// Admin Plugin — Options
// ---------------------------------------------------------------------------
// These fields surface the app's existing shell config (FayzAppConfig in
// @fayz-ai/saas — see packages/saas/src/app/config.ts): layout, moduleNav,
// mobileHeader, navTransition, orgSettings, and branding. They do not
// introduce a new config shape — this plugin only reflects what's already
// resolved at `defineSaas` time. There is no runtime write path yet: see
// README.md for the follow-up.
// ---------------------------------------------------------------------------

import type { PluginScope, VerticalId } from '@fayz-ai/core'
import type { AdminDataProvider } from './data/types'

export interface AdminPluginOptions {
  /** Shell layout variant (mirrors FayzAppConfig.layout). Default: 'sidebar'. */
  layout?: 'sidebar' | 'topbar' | 'minimal'
  /** How module-internal navigation renders (mirrors FayzAppConfig.moduleNav). Default: 'tabs'. */
  moduleNav?: 'rail' | 'tabs'
  /** Mobile header treatment (mirrors FayzAppConfig.mobileHeader). Default: 'minimal'. */
  mobileHeader?: 'minimal' | 'transparent' | 'hidden'
  /** Page navigation animation (mirrors FayzAppConfig.navTransition). Default: 'slide'. */
  navTransition?: 'slide' | 'fade' | 'none'
  /** Show org-level settings tabs (mirrors FayzAppConfig.orgSettings). Default: true. */
  orgSettings?: boolean
  /** Show branding/company settings tabs (mirrors FayzAppConfig.branding). Default: true. */
  branding?: boolean

  /** Plugin scope */
  scope?: PluginScope
  /** Vertical ID */
  verticalId?: VerticalId
  /** Data provider override (defaults to safe auto-selection) */
  dataProvider?: AdminDataProvider
}
