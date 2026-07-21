// ---------------------------------------------------------------------------
// @fayz-ai/testing — shared Playwright contracts + fixtures for the Fayz SDK
// dogfood apps. The Checkup reporter is a SEPARATE entry ('@fayz-ai/testing/
// reporter') so playwright.config can load it without pulling in test code.
// ---------------------------------------------------------------------------

// Config surface
export type {
  TestingAppConfig, TestingUser, Layout,
  CrudEntityConfig, CrudFieldSpec,
  AgendaConfig, AgendaPicker,
  ConversationsConfig,
  PermissionsConfig, ReadOnlyExpectation,
  ShellConfig,
  EntitlementsConfig, EntityFiller,
} from './config'
export { defineTestingConfig, ownerUser, timezoneOf } from './config'

// Contracts
export {
  allContracts,
  shellContract, crudContract, agendaContract, conversationsContract, permissionsContract,
  entitlementsContract,
  sdkTags, moduleId,
} from './contracts'

// Fixtures
export { authSetup } from './fixtures/auth'
export {
  backendClient, supabaseUrl, supabaseAnonKey,
  getTenantPlan, setTenantPlan, countTenantRows,
} from './fixtures/backend'
export type { BackendClient, SupabaseClient } from './fixtures/backend'
export { envVar, requireEnv } from './fixtures/env'
export {
  DEFAULT_TZ, fmtTimeSP, dateInTz, datePlus, weekdayOf, businessDatePlus, ddmm,
} from './fixtures/datetime'
export { strings } from './fixtures/i18n'
export type { Locale, LocaleStrings } from './fixtures/i18n'
export {
  freshList, gotoRoute, navItem, dialogConfirm, trashButton, waitSaveSettled, fillField,
} from './fixtures/selectors'
