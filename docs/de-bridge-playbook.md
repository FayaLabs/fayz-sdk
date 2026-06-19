# saas-core De-Bridge Playbook (W6)

> How to move a plugin's real implementation out of the legacy `@fayz/saas-core` and into its `@fayz-ai/plugin-*` package, so it builds natively (JS + declarations) on published packages. Proven on **plugin-tasks** (commit `a9fd56d`); this is the repeatable recipe for the rest. Companion: `architecture-blueprint.md` §7 (order), `architecture-v2.md` (target state).

## Order (smallest first, shell last)

`tasks ✅ → forms → inventory → crm → financial → agenda → reports → [the admin shell]`

The shell is deliberately last and separate — it owns the CRUD engine, `AppShell`, the i18n provider, and the org store that the plugins lean on. De-bridging it is what unblocks the **native admin scaffold** (and therefore the beauty-saas/resto-saas manifest migration, W5-admin) and resolves the locale-sync caveat below.

## The recipe (per plugin)

1. **Copy** `saas-core/src/plugins/<name>/*` → `plugins/plugin-<name>/src/`, replacing the stub.
2. **Map external imports** (saas-core relative paths → published packages):

   | saas-core import | → |
   |---|---|
   | `../../types/plugins`, `../../types/crud` | `@fayz-ai/core` |
   | `../../../hooks/useTranslation` | `@fayz-ai/core` |
   | `../../lib/supabase` (`getSupabaseClientOptional`) | `@fayz-ai/core` |
   | `../../../lib/cn` | `@fayz-ai/ui` |
   | `../../../components/ui/{button,sheet,checkbox,…}` | `@fayz-ai/ui` |
   | `../../lib/dedup` | vendor locally (`src/lib/dedup.ts`) |
   | `../../../stores/organization.store` | runtime-DI tenant accessor (`src/lib/tenant.ts`) |
   | `../../components/plugins/PluginSettingsPanel` | **drop** (pulls the CRUD engine) — render the plugin's own settings component directly |

3. **Vendor any missing `@fayz-ai/ui` primitive** the components use (cn-retargeted). tasks needed `Sheet` + `Checkbox`; these are now in `@fayz-ai/ui` and reusable. Confirm the radix dep is already in `@fayz-ai/ui/package.json` (dialog/checkbox/etc. mostly are).
4. **Register translations**: call `registerTranslations(<plugin>Locales)` in the `create*Plugin` factory — so the plugin's keys resolve even under a host shell that doesn't mount `@fayz-ai/core`'s `I18nProvider`.
5. **Flip to native build**: in `plugins/plugin-<name>/package.json` set `build` back to `tsup && tsc --emitDeclarationOnly --declaration --declarationMap --noEmit false`; in `tsup.config.ts` remove `@fayz/saas-core` from `external`; remove `<name>` from the `BRIDGED` set in `scripts/check-published-shape.mjs`.
6. **Build + fix types**, then verify the consuming app still renders the feature.

## Known type fix-ups (seen on tasks)

- **`useTranslation` shape**: saas-core returned `{ t }`; `@fayz-ai/core` returns `t` directly → change `const { t } = useTranslation()` to `const t = useTranslation()`.
- **Supabase client typing**: `@fayz-ai/core`'s `getSupabaseClientOptional()` is loosely typed (no `.from`) → `as any` at the `getClient()` boundary (runtime is fine), and annotate the resulting `.map/.filter` callbacks `(r: any)`.
- **Plugin `component` casts**: widget/settings components with specific prop types → `as unknown as React.ComponentType<unknown>`.

## The two architectural findings

1. **i18n locale-sync (cosmetic, expected).** A de-bridged plugin reads `@fayz-ai/core`'s i18n; the still-bridged saas-core shell populates *its own* i18n store and sets the locale there. `registerTranslations` makes keys resolve, but `@fayz-ai/core`'s locale store stays at its default (`en`) under the saas-core shell, so strings render in English until the shell de-bridges. Native `@fayz-ai/saas`/manifest apps (which call `setCurrentLocale`) are unaffected. **Do not try to hack per-plugin locale sync** — it's resolved structurally by de-bridging the shell.
2. **The CRUD engine is the gating dependency.** `PluginSettingsPanel` and the entity-management plugins (inventory/crm/financial/reports) depend on saas-core's CRUD engine (`CrudPage`, `createCrudStore`, data-provider resolve) and `createCrudPage`. tasks avoided it by dropping the settings-panel wrapper, but the data-heavy plugins can't. **Before crm/financial/inventory/reports, the CRUD engine must move to `@fayz-ai/ui` (or `@fayz-ai/saas`)** — that's the real first domino, larger than any single plugin.

## Recommended next step

De-bridge **forms** next (smaller, form-builder, fewer CRUD-engine ties) to harden the recipe, then **extract the CRUD engine into `@fayz-ai/ui`** as its own sub-task — it unblocks the four data plugins *and* the admin shell at once. Sequence: forms → CRUD-engine extraction → inventory → crm → financial → reports → agenda → shell → (then W5-admin: native admin scaffold + beauty/resto manifest migration).
