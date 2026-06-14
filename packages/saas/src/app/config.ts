import type { ComponentType } from 'react'
import type {
  AuthAdapter,
  OrgAdapter,
  PluginManifest,
  SaasTheme,
  ThemeMode,
  LocaleConfig,
  PermissionsConfig,
  BillingConfig,
} from '@fayz-ai/core'

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
  component: ComponentType
  section?: PageSection
}

// ---------------------------------------------------------------------------
// Sub-config types
// ---------------------------------------------------------------------------

export interface AuthConfig {
  /** 'supabase' | 'mock' or bring your own AuthAdapter */
  adapter?: 'supabase' | 'mock' | AuthAdapter
  /** Redirect to login when no session is found (default: true) */
  requireAuth?: boolean
}

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
  systemPrompt?: string
  apiEndpoint?: string
}

// ---------------------------------------------------------------------------
// Root config
// ---------------------------------------------------------------------------

export interface FayzAppConfig {
  /** Application display name */
  name: string

  // -------------------------------------------------------------------------
  // Data connection
  // -------------------------------------------------------------------------
  supabaseUrl?: string
  supabaseAnonKey?: string

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  auth?: AuthConfig

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
  theme?: SaasTheme
  defaultThemeMode?: ThemeMode
  /** Shell layout variant (default: 'sidebar') */
  layout?: 'sidebar' | 'topbar' | 'minimal'

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
  billing?: BillingConfig

  // -------------------------------------------------------------------------
  // AI Chat
  // -------------------------------------------------------------------------
  chat?: ChatConfig
}
