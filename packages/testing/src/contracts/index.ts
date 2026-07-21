// ---------------------------------------------------------------------------
// Contract barrel + `allContracts(cfg)` — instantiate every contract the app's
// config declares, in one call. An app's e2e/contracts.spec.ts is then just:
//
//   import { allContracts } from '@fayz-ai/testing'
//   import { config } from './fixtures/testing.config'
//   allContracts(config)
//
// Each contract lives in its own file so it can graduate to a plugin-owned
// `plugins/<p>/testing` package later without touching the others.
// ---------------------------------------------------------------------------
import type { TestingAppConfig } from '../config'
import { shellContract } from './shell'
import { crudContract } from './crud'
import { agendaContract } from './agenda'
import { conversationsContract } from './conversations'
import { permissionsContract } from './permissions'
import { entitlementsContract } from './entitlements'

export { shellContract } from './shell'
export { crudContract } from './crud'
export { agendaContract } from './agenda'
export { conversationsContract } from './conversations'
export { permissionsContract } from './permissions'
export { entitlementsContract } from './entitlements'
export { sdkTags, moduleId } from './util'

/** Instantiate every contract declared in `cfg.modules`. Order is stable so the
 *  generated report reads top-down: shell, CRUD entities, agenda, conversations,
 *  permissions. */
export function allContracts(cfg: TestingAppConfig): void {
  const m = cfg.modules
  if (m.shell) shellContract(cfg)
  for (const entity of m.crud ?? []) crudContract(cfg, entity)
  if (m.agenda) agendaContract(cfg, m.agenda)
  if (m.conversations) conversationsContract(cfg, m.conversations)
  if (m.permissions) permissionsContract(cfg, m.permissions)
  if (m.entitlements) entitlementsContract(cfg, m.entitlements)
}
