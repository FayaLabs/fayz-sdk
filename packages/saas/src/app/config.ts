import type { ComponentType, ReactNode } from 'react'
import type {
  AuthAdapter,
  AuthProvider,
  OrgAdapter,
  PluginManifest,
  ThemeMode,
  LocaleConfig,
  PermissionsConfig,
} from '@fayz-ai/core'
import type { AuthPluginOptions, ResolvedAuthPlugin } from '@fayz-ai/plugin-auth'
import type { BottomNavItem, MobileHeaderVariant } from '@fayz-ai/ui'
import type { SaasTheme } from '../shell/config/theme/tokens'
import type { CreateThemeOptions } from '../shell/config/theme/utils'
import type { PlanConfig } from '../shell/types/billing'

// ---------------------------------------------------------------------------
// Page registration
// ---------------------------------------------------------------------------

export type PageSection = 'main' | 'secondary' | 'settings'

export interface CustomPage {
  /** Route path, e.g. '/reports' */
  path: string
  /** Display label in navigation */
  label?: string
  /** Lucide icon name or any string identifier */
  icon?: string
  component?: ComponentType
  section?: PageSection
  position?: number
  badge?: string | number
  permission?: { feature: string; action: 'read' | 'create' | 'edit' | 'delete' }
  children?: CustomPage[]
}

// ---------------------------------------------------------------------------
// Sub-config types
// ---------------------------------------------------------------------------

export interface AuthConfig {
  /** 'supabase' | 'mock' or bring your own AuthAdapter */
  adapter?: AuthPluginOptions['adapter']
  /** New plugin-auth provider selector. Existing apps may keep using adapter. */
  provider?: AuthPluginOptions['provider']
  /** Redirect to login when no session is found (default: true) */
  requireAuth?: boolean
  /** New plugin-auth route and provider options. */
  routes?: AuthPluginOptions['routes']
  supabase?: AuthPluginOptions['supabase']
  oauth?: AuthPluginOptions['oauth']
  layout?: AuthPluginOptions['layout']
  logo?: ReactNode
  tagline?: string
  description?: string
  loginLogo?: ReactNode
  loginLayout?: 'split' | 'centered'
  loginTagline?: string
  loginDescription?: string
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
}

export type AppAuthConfig = AuthConfig | ResolvedAuthPlugin

export interface OrgConfig {
  /** 'supabase' | 'mock' or bring your own OrgAdapter */
  adapter?: 'supabase' | 'mock' | OrgAdapter
  /** Support multiple orgs per user (default: true) */
  multiOrg?: boolean
  /** Auto-create an org when the user has none (default: true) */
  autoCreate?: boolean
}

export interface ChatConfig {
  enabled?: boolean
  title?: string
  systemPrompt?: string
  apiEndpoint?: string
}

export interface FayzBillingConfig {
  plans: PlanConfig[]
  stripePublishableKey?: string
  portalUrl?: string
}

// ---------------------------------------------------------------------------
// Root config
// ---------------------------------------------------------------------------

export interface FayzAppConfig {
  /** Application display name */
  name: string
  logo?: string | ReactNode

  // -------------------------------------------------------------------------
  // Data connection
  // -------------------------------------------------------------------------
  supabaseUrl?: string
  supabaseAnonKey?: string

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  auth?: AppAuthConfig

  // -------------------------------------------------------------------------
  // Organization / multi-tenancy
  // -------------------------------------------------------------------------
  org?: OrgConfig

  // -------------------------------------------------------------------------
  // Plugins
  // -------------------------------------------------------------------------
  plugins?: PluginManifest[]

  // -------------------------------------------------------------------------
  // Custom pages
  // -------------------------------------------------------------------------
  pages?: CustomPage[]

  // -------------------------------------------------------------------------
  // Theme
  // -------------------------------------------------------------------------
  theme?: CreateThemeOptions | SaasTheme
  defaultThemeMode?: ThemeMode
  /** Shell layout variant (default: 'sidebar') */
  layout?: 'sidebar' | 'topbar' | 'minimal'
  /** Mobile bottom tab bar. Rendered by AppShell on small screens (md:hidden)
   *  for every layout variant. Route items map a lucide icon name to a route; an
   *  `{ kind: 'action', id, icon }` item renders as a raised center button
   *  (Mobills style) that fires `onBottomNavAction(id)` instead of navigating. */
  bottomNav?: BottomNavItem[]
  /** Fired when a bottom-nav `action` item (e.g. the center "+") is tapped. */
  onBottomNavAction?: (id: string) => void
  /** Mobile header treatment (<md), default 'minimal'. 'transparent' renders no
   *  header bar (edge-to-edge content) with a floating profile avatar top-right;
   *  'hidden' renders neither. Desktop keeps its sidebar + user menu. */
  mobileHeader?: MobileHeaderVariant
  /** Wrap the main content in an inset "framed" card (default: true). The
   *  sidebar itself is always flush/full-height. */
  contentFrame?: boolean
  /** How module-internal navigation renders. Defaults to 'tabs' for the
   *  'sidebar' layout and 'rail' for 'topbar'. */
  moduleNav?: 'rail' | 'tabs'
  /** Page navigation animation applied to all nested navigations (route + module
   *  view changes). Default: 'slide'. Set per repo/app for a different feel. */
  navTransition?: 'slide' | 'fade' | 'none'

  // -------------------------------------------------------------------------
  // i18n
  // -------------------------------------------------------------------------
  locale?: LocaleConfig

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------
  permissions?: PermissionsConfig

  // -------------------------------------------------------------------------
  // Billing
  // -------------------------------------------------------------------------
  billing?: FayzBillingConfig

  // -------------------------------------------------------------------------
  // AI Chat
  // -------------------------------------------------------------------------
  chat?: ChatConfig
}
