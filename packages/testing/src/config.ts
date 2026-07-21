// ---------------------------------------------------------------------------
// TestingAppConfig — the single object that parameterizes an app's whole SDK
// contract suite. Everything the 5 dogfood suites differed on (port, locale,
// timezone, layout, creds, entity labels, restricted-profile expectations)
// lives here; the contract factories in ./contracts read it and emit the
// Playwright tests. Add a module block → the contract runs → the Checkup report
// grows a row. Omit a module that's installed → it shows up as a GAP.
// ---------------------------------------------------------------------------
import type { Locale } from './fixtures/i18n'

export type Layout = 'sidebar' | 'topbar'

/** One user the suite logs in as (owner or a restricted profile). */
export interface TestingUser {
  /** Logical role — 'owner' is the default storageState for generated tests. */
  role: 'owner' | 'restricted' | string
  email: string
  /** Resolved secret (read from env by the app before building the config). */
  password: string
  /** Where authSetup persists this user's storageState, e.g. 'e2e/.auth/qa-owner.json'. */
  storageState: string
}

/** A single create-form field. Provide exactly one locator strategy. */
export interface CrudFieldSpec {
  /** CSS selector, resolved within `main` unless it already scopes itself. */
  selector?: string
  /** Accessible label (getByLabel) — alternative to `selector`. */
  label?: string
  /** Value to type. A function receives the per-run stamp for uniqueness. */
  value: string | ((stamp: number) => string)
  /** True if this field's value is the row's identity (used to find it in the list). */
  identity?: boolean
}

/** createCrudPage lifecycle for one entity (create → edit → delete). */
export interface CrudEntityConfig {
  /** Module id for `@module:` tagging + Checkup grouping (e.g. 'crm'). */
  module: string
  /** Hash route of the list page, e.g. '/students' or '/clients'. */
  route: string
  /** Entity noun used in default labels: "Aluno" → "Adicionar Aluno". */
  entityLabel: string
  /** Override the list nav button (default `+ Adicionar {entity}`). */
  addNavLabel?: string
  /** Override the SaveBar create button (default `Adicionar {entity}`). */
  saveNewLabel?: string
  /** Override the SaveBar edit button (default locale `Salvar Alterações`). */
  saveEditLabel?: string
  /** Override the delete confirm button (default locale `Excluir`). */
  deleteLabel?: string
  /** Create-form fields. Exactly one should be `identity: true`. */
  fields: CrudFieldSpec[]
  /** Backend teardown: sweep rows whose `column` starts with `prefix` from `table`. */
  cleanup?: { table: string; column: string; prefix: string }
}

/** A picker inside the agenda booking modal (professional / client / service). */
export interface AgendaPicker {
  /** Trigger button that opens the picker. */
  trigger: string | RegExp
  /** Search input placeholder (omit for pick-from-list pickers). */
  searchPlaceholder?: string | RegExp
  /** Seeded value to select. */
  value: string
}

/** agendaContract — booking create/edit/delete over the Agenda plugin. */
export interface AgendaConfig {
  module?: string // default 'agenda'
  route: string
  /** "Criar"/"Create" open-modal button. */
  createLabel: string
  professional: AgendaPicker
  /** Omit when the booking kind requires no client. */
  client?: AgendaPicker
  /** Omit when the booking kind requires no service (e.g. agency Meeting). */
  service?: AgendaPicker
  /** Collapsible that reveals the description textarea ("Adicionar observações"). */
  notesToggle: string | RegExp
  /** Description textarea placeholder. */
  notesPlaceholder: string | RegExp
  /** A calendar chip's unique text to re-open the booking (defaults to client value). */
  reopenText?: string
  /** appointments table + notes column for authoritative persistence proof. */
  table?: string // default 'appointments'
  notesColumn?: string // default 'notes'
  /** Tenant id filter for the persistence query + cleanup. */
  tenantId: string
  /** Note prefix for created bookings (also the cleanup ilike prefix). */
  notePrefix?: string // default 'QA booking'
}

/** conversationsContract — compose → send → reload persists (proved in DB). */
export interface ConversationsConfig {
  module?: string // default 'conversations'
  route: string
  /** Extra step between "new" and the form (dentist picks a "WhatsApp" channel). */
  channelLabel?: string
  /** Contact-name input (id or selector). */
  nameField: string
  /** Contact-handle input (phone/email). */
  handleField: string
  /** First-message input. */
  messageField: string
  /** Submit button ("Iniciar conversa" / "Start conversation"). */
  startLabel: string
  /** Backend table + tenant id for the persistence proof. */
  table?: string // default 'plg_conversations'
  tenantId: string
}

/** A read-only page: heading present, but the create button hidden. */
export interface ReadOnlyExpectation {
  route: string
  heading: string
  hiddenButton: string | RegExp
}

/** permissionsContract — restricted profile sees a reduced surface vs owner. */
export interface PermissionsConfig {
  module?: string // default 'permissions'
  /** Nav labels the owner must see (sanity that they exist at all). */
  ownerNav?: string[]
  /** Create affordances the owner has that the restricted profile won't. */
  ownerCreate?: { route: string; button: string | RegExp }[]
  restricted: {
    /** storageState path for the restricted profile. */
    storageState: string
    /** A route to land on before nav assertions. */
    landingRoute: string
    /** Nav labels the restricted profile DOES have (present). */
    visibleNav: string[]
    /** Nav labels the restricted profile lacks (absent). */
    hiddenNav: string[]
    /** Routes that answer with the permission gate. */
    blockedRoutes: string[]
    /** Read-only pages (heading shows, create button hidden). */
    readOnly?: ReadOnlyExpectation[]
  }
  /** Override the gate text (resto shows EN under pt-BR). Default: locale string. */
  restrictedText?: string
}

/** A page-fill closure for the limit probe: fill + submit the create form for a
 *  row named `name`. The contract owns the (timestamped) name so it can count &
 *  tear down the exact rows it created. Receives the Playwright `page`. */
export type EntityFiller = (page: import('@playwright/test').Page, name: string) => Promise<void>

/**
 * entitlementsContract — plan × role composition: a plan-gated feature paywalls
 * (not a role AccessDenied), a quantity limit blocks the create past its cap
 * (UpgradeModal, row NOT persisted), an upgrade unblocks it, the menu badge
 * tracks the plan, and a role-hidden module stays hidden even under a plan that
 * would badge it premium. Drives the flip through `tenants.plan` (see
 * fixtures/backend setTenantPlan), always restoring the original plan.
 */
export interface EntitlementsConfig {
  module?: string // default 'entitlements'
  /** Tenant whose plan is flipped + whose rows the limit probe counts. */
  tenantId: string
  /** The two plan ids the contract flips between. */
  planFlip: {
    /** Tiny-caps QA plan (e.g. 'qa-free-test') the paywalls are exercised under. */
    freeTestPlanId: string
    /** A paid plan that lifts the caps + unlocks the feature (e.g. 'pro'). */
    paidPlanId: string
    /** Display name of the free-test plan (menu-badge assertion). Optional. */
    freeTestPlanName?: string
    /** Display name of the paid plan (menu-badge assertion). Optional. */
    paidPlanName?: string
  }
  /** A feature gated to a higher plan (Free → premium badge + UpgradePrompt). */
  planGatedFeature: {
    /** Feature id (same id space as RBAC/nav), e.g. 'marketing'. */
    feature: string
    /** Nav label of the feature's item, e.g. 'Marketing'. */
    navLabel: string
    /** Route of the feature, e.g. '/marketing'. */
    route: string
  }
  /** A quantity limit exercised to its cap and past it. */
  limitProbe: {
    /** limitKey resolved by the plan caps + a LimitDeclaration, e.g. 'clients'. */
    limitKey: string
    /** List route of the entity, e.g. '/clients' or '/students'. */
    route: string
    /** The list "+ Add {entity}" button that opens the create form. */
    addLabel: string | RegExp
    /** Fill + submit the create form for a row named `name`. */
    fillEntity: EntityFiller
    /** The plan's cap for this key under freeTestPlan (e.g. 2). */
    capForTest: number
    /** How to count/tear down the rows fillEntity creates. */
    count: {
      /** Backend table, e.g. 'people'. */
      table: string
      /** Name column used to match & clean up created rows. */
      column: string
      /** Optional `kind` filter for multi-kind tables (e.g. 'customer'|'student'). */
      kind?: string
    }
    /** Prefix for the (timestamped) created row names. Default 'QA Ent'. */
    namePrefix?: string
  }
  /** Role×plan composition (test e): a restricted user under the free-test plan. */
  compose: {
    /** storageState of a user WITHOUT the gated feature's role grant. */
    restrictedStorageState: string
    /** A route to land on before the nav assertion. */
    landingRoute: string
  }
  /** Selector to open the account menu for the plan-badge check (test d).
   *  Defaults to the last `button[aria-haspopup="menu"]` (sidebar footer). */
  accountTrigger?: string
}

/** shellContract — the cross-cutting shell behaviors (settings, toggles, chrome). */
export interface ShellConfig {
  module?: string // default 'shell'
  /** Company-name settings page. */
  settings?: { route: string; nameSelector: string }
  /** A plugin toggle in /settings: open a section, flip the first switch, persist. */
  pluginToggle?: { route: string; sectionButton: string }
  /** Workspace switcher: a trigger selector + the menu marker it reveals. */
  workspace?: { trigger: string; menuText?: string | RegExp }
  /** Assistant FAB honesty check. Omit to skip. */
  fab?: { openLabel?: string; unconfigured?: RegExp }
  /**
   * Notification bell. Omit on topbar layouts — the SDK's NotificationBell only
   * mounts in the sidebar layout, so topbar apps have no sino (contract skips).
   */
  bell?: { label?: string; inbox?: string | RegExp }
}

export interface TestingAppConfig {
  /** App id used in `@app:` tags + Checkup columns (e.g. 'schoolsoft'). */
  app: string
  /** Admin base URL, e.g. 'http://localhost:5311'. */
  baseURL: string
  layout: Layout
  locale: Locale
  /** Tenant timezone for date math (default America/Sao_Paulo). */
  timezone?: string
  /** Login chrome. */
  auth: {
    /** Sign-in button (English in every app; default 'Sign in'). */
    loginButton?: string
    /** Nav button visible after a successful login (confirms the shell mounted). */
    landmark: string
    users: TestingUser[]
  }
  /** A nav landmark used by the shell contract to confirm the shell mounted. */
  shellLandmark?: string
  modules: {
    shell?: ShellConfig
    crud?: CrudEntityConfig[]
    agenda?: AgendaConfig
    conversations?: ConversationsConfig
    permissions?: PermissionsConfig
    entitlements?: EntitlementsConfig
  }
  /**
   * Ids of plugins installed in the app. Any id here WITHOUT a matching module
   * block above is reported by Checkup as an explicit GAP ("installed without
   * contract") — so the report grows on its own when a plugin is added.
   */
  installedModules?: string[]
}

/** Identity helper — gives editors autocomplete on the config object. */
export function defineTestingConfig(cfg: TestingAppConfig): TestingAppConfig {
  return cfg
}

/** The owner user (default storageState for generated tests). */
export function ownerUser(cfg: TestingAppConfig): TestingUser {
  const owner = cfg.auth.users.find((u) => u.role === 'owner') ?? cfg.auth.users[0]
  if (!owner) throw new Error(`[testing] ${cfg.app}: no auth users configured`)
  return owner
}

export function timezoneOf(cfg: TestingAppConfig): string {
  return cfg.timezone ?? 'America/Sao_Paulo'
}
