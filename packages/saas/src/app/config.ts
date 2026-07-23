import type { ComponentType, ReactNode } from 'react'
import type {
  AuthAdapter,
  AuthProvider,
  OrgAdapter,
  PluginManifest,
  ThemeMode,
  LocaleConfig,
  PermissionsConfig,
  LimitDeclaration,
  AgentDomainKnowledge,
  AgentRpcDeclaration,
  EntityDef,
} from '@fayz-ai/core'
import type { AuthPluginOptions, ResolvedAuthPlugin, LoginAmbassador } from '@fayz-ai/plugin-auth'
import type { BottomNavItem, MobileHeaderVariant } from '@fayz-ai/ui'
import type { SaasTheme } from '../shell/config/theme/tokens'
import type { CreateThemeOptions } from '../shell/config/theme/utils'
import type { PlanConfig } from '../shell/types/billing'
import type { FayzAgentConnectionConfig } from '../shell/lib/fayz-agent'

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
  /** Show this page in the sidebar/topbar navigation. Default: true. Set `false`
   *  for mobile-only pages reachable via bottomNav/avatar (e.g. a "Mais" overflow
   *  hub or a "Perfil" avatar target): the route still works, but the entry is
   *  hidden from desktop navigation where those mobile constructs are meaningless. */
  nav?: boolean
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
  /** Product ambassadors shown as a small social-proof avatar strip above the
   *  tagline on the split-login brand panel. Each needs a local `image` path;
   *  degrades to nothing when omitted. */
  loginAmbassadors?: LoginAmbassador[]
  /** Optional microtext beside the ambassador strip, e.g. "+2 mil profissionais". */
  loginAmbassadorsLabel?: string
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

export interface TeamConfig {
  /**
   * Which person `kind`s make up the "team" (shown on /settings/team).
   * Person-first model: the Team screen is driven by people of these kinds;
   * `tenant_members` (login + role) is an optional access overlay per person.
   * e.g. beauty-saas: ['staff'] · school-saas: ['teacher', 'staff'].
   * When empty/undefined, the Team screen falls back to membership-only (legacy).
   */
  personKinds?: string[]
}

export interface ChatConfig {
  enabled?: boolean
  title?: string
  /** `'dock'` (default) mounts the assistant in the shell's right rail.
   *  `'none'` mounts no surface — the engine stays available to the app. */
  surface?: 'dock' | 'none'
  /** Extra guidance appended to the agent's own instructions. */
  systemPrompt?: string
  /**
   * Bring-your-own chat backend. Leave unset to use the Fayz agent configured
   * for this project — the container injects the connection env, so no key or
   * URL needs to live in app config.
   */
  apiEndpoint?: string
  /**
   * Overrides for the Fayz agent connection, for apps built outside a Fayz
   * container. `false` opts out of the Fayz agent entirely.
   */
  agent?: FayzAgentConnectionConfig | false
  /** Speaking and listening. Sensible defaults; no config needed to get a mic. */
  voice?: ChatVoiceConfig
}

export interface ChatVoiceConfig {
  /** `false` hides the microphone entirely. */
  input?: boolean
  /** Recognition language (BCP-47). Defaults to the browser's. */
  locale?: string
  /**
   * Endpoint that takes an audio clip (multipart `file`) and answers
   * `{ text }`. This is the seam for Whisper or any other STT service — set it
   * and the mic stops using the browser's recognizer. Left unset (the default)
   * the assistant listens with the browser's own engine: no key, no backend.
   */
  transcribeEndpoint?: string
  /** Send the transcript without review. Default false — dictation fills the
   *  composer and the user presses send. */
  autoSend?: boolean
  /** Offer the spoken-replies toggle (default `true`). */
  replies?: boolean
  /** Start with spoken replies ON. Off by default — a back-office app that
   *  starts talking on its own is a support ticket, not a feature. */
  repliesDefaultOn?: boolean
}

export interface FayzBillingConfig {
  plans: PlanConfig[]
  stripePublishableKey?: string
  portalUrl?: string
  /**
   * Payment-gateway seam. When defined, the shell's Subscription page calls this
   * with the target plan id INSTEAD of writing `plan` straight onto the org — this
   * is where Stripe Checkout / Pix / Mercado Pago plug in (create the intent,
   * redirect, let the webhook persist the plan). Left undefined, changing plan is
   * an optimistic `adapter.updateOrg(orgId, { plan })`.
   */
  onCheckout?: (planId: string) => Promise<void> | void
  /**
   * App-level limit declarations layered on top of the plugins' `declaredLimits`
   * (app wins on key collision). Use to add limits for app-local tables the
   * plugins don't know about, or to re-point a key at a different table.
   */
  limitDeclarations?: LimitDeclaration[]
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
  // Team (who counts as a "team member")
  // -------------------------------------------------------------------------
  team?: TeamConfig

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
  // Settings surface
  // -------------------------------------------------------------------------
  /** Show org-level settings tabs (Equipe/Permissões/Localizações/Regras).
   *  Defaults to `Boolean(org)` for back-compat. B2C/personal apps that still
   *  need an org for the workspace can set `false` to hide these ERP tabs. */
  orgSettings?: boolean
  /** Show the branding ("Identidade Visual") + company "Geral" settings tabs.
   *  Default: `true`. B2C apps set `false` to drop org-identity settings, leaving
   *  Perfil + Segurança + plugin settings only. */
  branding?: boolean

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

  // -------------------------------------------------------------------------
  // Agent contract (manifest v3) — app-level additions to the derived
  // AgentContract: structured domain knowledge for the prompt, app-shipped
  // pool RPCs, and the per-app server-plane flip. Everything else (entities,
  // tools, features, limits) is DERIVED from what the app already declares.
  // -------------------------------------------------------------------------
  agentContract?: {
    /** 'server' flips data tools to broker-side execution for this app. */
    executionPlane?: 'client' | 'server'
    knowledge?: AgentDomainKnowledge
    /** RPCs the app itself ships (vertical-specific, e.g. pricing quote). */
    rpcs?: AgentRpcDeclaration[]
    /** App-level read-models for the agent's data primitives (same contract
     *  as PluginManifest.queryEntities — stable ASCII keys). */
    queryEntities?: Array<{ key: string; entity: EntityDef }>
  }
}
