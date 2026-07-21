# @fayz-ai/testing

Shared Playwright **contracts** and a **Checkup reporter** for the Fayz SDK
dogfood apps. Roughly 70% of every app's e2e suite was the same SDK behavior
(login, CRUD, agenda booking, conversations, permissions, shell chrome) repeated
with different parameters — port, locale, layout, entity labels, credentials,
seeded ids. This package extracts that into **contract factories** driven by a
single per-app config object, and a reporter that aggregates results into a
human-legible `CHECKUP.md`.

## What's in the box

```
src/
  config.ts               TestingAppConfig type + defineTestingConfig()
  reporter.ts             Checkup reporter (exported at @fayz-ai/testing/reporter)
  fixtures/
    env.ts                readDotEnv / envVar / requireEnv (process.env wins)
    datetime.ts           SP-timezone date math (businessDatePlus, ddmm, …)
    backend.ts            backendClient(): anon + authenticated Supabase clients
    auth.ts               authSetup(config) → one login-and-persist setup per user
    i18n.ts               pt-BR / en string table (all strings overridable)
    selectors.ts          i18n- & layout-aware DOM helpers (SaveBar, dialog, nav)
  contracts/
    shell.ts              shellContract(cfg)
    crud.ts               crudContract(cfg, entity)
    agenda.ts             agendaContract(cfg, agenda)
    conversations.ts      conversationsContract(cfg, conv)
    permissions.ts        permissionsContract(cfg, perms)
    index.ts              allContracts(cfg) — instantiate every declared module
```

Each contract lives in its own file so it can later **graduate** to a
plugin-owned `plugins/<plugin>/testing` package (agenda → plugin-agenda,
conversations → plugin-conversations, permissions → packages/saas) without
touching the others.

## Factory API

```ts
allContracts(cfg: TestingAppConfig): void            // all declared modules

shellContract(cfg): void                             // settings persist, toggle,
                                                     // workspace, FAB, bell
crudContract(cfg, entity: CrudEntityConfig): void    // create/edit/delete
agendaContract(cfg, agenda: AgendaConfig): void      // booking CRUD + DB proof
conversationsContract(cfg, conv: ConversationsConfig): void
permissionsContract(cfg, perms: PermissionsConfig): void

authSetup(cfg): void                                 // call from *.setup.ts
```

Every generated test is tagged `@module:<id>`, `@app:<name>`, and `@contract`.
The reporter aggregates on those tags.

## How an app consumes it

1. **Add the dependency** (dev):

   ```jsonc
   // package.json
   "devDependencies": { "@fayz-ai/testing": "workspace:^" }  // or the published range
   ```

2. **Write the config** — `e2e/fixtures/testing.config.ts`:

   ```ts
   import { defineTestingConfig } from '@fayz-ai/testing'
   export const config = defineTestingConfig({
     app: 'schoolsoft',
     baseURL: 'http://localhost:5311',
     layout: 'sidebar',            // 'topbar' apps have no notification bell
     locale: 'pt-BR',
     auth: { landmark: 'Agenda', users: [ /* owner + restricted */ ] },
     modules: { shell: {…}, crud: […], agenda: {…}, conversations: {…}, permissions: {…} },
     installedModules: ['shell','crm','agenda',…],   // drives the GAP section
   })
   ```

3. **Two one-line spec files:**

   ```ts
   // e2e/contracts.setup.ts
   import { authSetup } from '@fayz-ai/testing'
   import { config } from './fixtures/testing.config'
   authSetup(config)
   ```
   ```ts
   // e2e/contracts.spec.ts
   import { allContracts } from '@fayz-ai/testing'
   import { config } from './fixtures/testing.config'
   allContracts(config)
   ```

4. **Wire the reporter** in `playwright.config.ts`:

   ```ts
   reporter: [
     ['list'],
     ['@fayz-ai/testing/reporter', { app: 'schoolsoft', installedModules: [...] }],
   ]
   ```

5. **Keep app-specific / vertical specs local**, tagged `@local` (and, when they
   exercise a module, `@module:<id>` so they land in that module's Local column):

   ```ts
   test('site booking lands in admin', { tag: ['@module:agenda', '@local'] }, …)
   ```

See `school-saas/e2e` for the reference conversion.

## Converting the remaining apps

The pilot (school, sidebar/pt-BR) is done. The four others differ only in config
values — no contract code changes. Per-app deltas:

| App | port | locale | layout | restricted role | gate string | notes |
|-----|------|--------|--------|-----------------|-------------|-------|
| **beauty** | 5301 | pt-BR | `topbar` | secretaria | `Acesso restrito` | no bell (topbar); entity **Cliente**; registry `/registry/services` |
| **resto** | 5302 | pt-BR | `topbar` | waiter | **`Access restricted`** (EN under pt-BR → set `permissions.restrictedText`) | no agenda/conversations; entity **Cliente** but `addNavLabel: '+ Add Cliente'`; inventory/menu are local specs |
| **agency** | 5303 | en | `sidebar` | agent | `Access restricted` | entity **Contact**; agenda kind = **Meeting** → omit `agenda.service`; conversations EN (`startLabel: 'Start conversation'`) |
| **dentist** | 5302 | pt-BR | `sidebar` | recepcao | `Acesso restrito` | entity **Paciente** (`/clients`); env in **`.env.local`**; conversations need `channelLabel: 'WhatsApp'`; HempDent site is a local `@crossflow` spec |

Concretely, to convert one app:

1. `cp` school's `contracts.spec.ts` + `contracts.setup.ts` verbatim (they only
   import the config).
2. Author `e2e/fixtures/testing.config.ts` with that app's values. For **topbar**
   apps set `layout: 'topbar'` and **omit `modules.shell.bell`** (the SDK's
   NotificationBell only mounts in the sidebar layout — the contract skips it
   automatically when `layout==='topbar'`, but omitting the block is clearest).
3. For **English** apps set `locale: 'en'`; the i18n table flips SaveBar/gate/FAB
   strings. Override any single string on the relevant module block if the app
   diverges (e.g. resto's `restrictedText`).
4. Repoint the `qa`/`qa-setup` Playwright projects at `contracts.spec.ts` /
   `contracts.setup.ts` and add the reporter.
5. Keep the app's vertical specs (site-booking, inventory, menu, cross-flows) and
   tag them `@local`.

### Config knobs that cover the observed variation

- **layout** `sidebar | topbar` — gates the bell test.
- **locale** `pt-BR | en` — default strings; every string overridable per module.
- **permissions.restrictedText** — for resto's EN gate under a pt-BR shell.
- **crud[].addNavLabel / saveNewLabel / saveEditLabel / deleteLabel** — for label
  quirks (resto's mixed-language "+ Add Cliente", agency "Delete Contact").
- **agenda.client / agenda.service** — omit either for client-only (Meeting) or
  resource-only booking kinds.
- **conversations.channelLabel** — for the extra channel-pick step (dentist).
- **auth.users[].storageState** — where each session is persisted.

## Notes / limitations

- `@playwright/test` and `@supabase/supabase-js` are **peer dependencies** —
  provided by the consuming app so there is exactly one Playwright instance.
- When developing against a non-workspace app (school/dentist live outside this
  repo's pnpm workspace), install the package so its peers resolve from the
  **app's** `node_modules`, not the SDK repo's (two Playwright copies error out).
- The reporter counts only each test's final attempt (retry-aware).
