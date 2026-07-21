// ---------------------------------------------------------------------------
// crudContract — the full createCrudPage lifecycle for ANY entity: open the
// list, "+ Adicionar {entity}" → fill form → SaveBar "Adicionar {entity}" →
// open detail → "Editar" → "Salvar Alterações" → trash → confirm "Excluir".
// A DB sweep in afterAll removes any survivor of a failed run.
//
// Deduped from the 5 qa-crud.spec.ts copies — the only differences were the
// route, entity label, and field selectors, all now in the entity config.
//
// Owner of the contract: whichever plugin renders the entity's createCrudPage
// (CRM for people, etc.); graduates to `plugins/<p>/testing` when it wants one.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test'
import type { TestingAppConfig, CrudEntityConfig, CrudFieldSpec } from '../config'
import { strings } from '../fixtures/i18n'
import { ownerUser } from '../config'
import { backendClient } from '../fixtures/backend'
import { freshList, fillField, trashButton, dialogConfirm, gotoRoute } from '../fixtures/selectors'
import { sdkTags } from './util'

function resolveValue(spec: CrudFieldSpec, stamp: number): string {
  return typeof spec.value === 'function' ? spec.value(stamp) : spec.value
}

export function crudContract(cfg: TestingAppConfig, entity: CrudEntityConfig): void {
  const module = entity.module
  const s = strings(cfg.locale)
  const tags = sdkTags(cfg, module)

  const addNav = entity.addNavLabel ?? s.addNav(entity.entityLabel)
  const saveNew = entity.saveNewLabel ?? s.saveNew(entity.entityLabel)
  const saveEdit = entity.saveEditLabel ?? s.saveEdit
  const deleteLabel = entity.deleteLabel ?? s.delete
  const idField = entity.fields.find((f) => f.identity) ?? entity.fields[0]

  test.describe(`[${cfg.app}] ${entity.entityLabel} CRUD contract`, () => {
    test(`create, edit and delete a ${entity.entityLabel}`, tags, async ({ page }) => {
      const stamp = Date.now()
      const name = resolveValue(idField, stamp)
      const edited = `${name} EDIT`

      // ---- CREATE ----
      await gotoRoute(page, cfg.baseURL, entity.route)
      await page.getByRole('button', { name: addNav }).click()
      for (const field of entity.fields) {
        await fillField(page, field, resolveValue(field, stamp))
      }
      // Wait for the SaveBar commit button to ENABLE before clicking — clicking
      // it while the form is still validating is a silent no-op (the SaveBar
      // never clears, the insert never fires). This was the CRUD flake.
      const createBtn = page.getByRole('button', { name: saveNew, exact: true })
      await expect(createBtn).toBeEnabled({ timeout: 15_000 })
      await createBtn.click()
      // Give the in-flight insert time to settle (a premature navigation aborts
      // it), but the AUTHORITATIVE proof is the row landing in the list below —
      // the SaveBar clearing is only a UX signal, so tolerate it lingering rather
      // than hard-failing (that was the in-suite CRUD flake).
      await createBtn.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {})
      await freshList(page, cfg.baseURL, entity.route)
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 15_000 })

      // ---- EDIT ----
      await page.getByText(name, { exact: false }).first().click()
      await page.getByRole('button', { name: /Editar|Edit/ }).first().click()
      const editInput = idField.selector
        ? page.locator(idField.selector.includes(' ') || idField.selector.startsWith('#')
            ? idField.selector : `main ${idField.selector}`).first()
        : page.getByLabel(idField.label!).first()
      await expect(editInput).toHaveValue(name, { timeout: 15_000 })
      await editInput.fill(edited)
      const saveBtn = page.getByRole('button', { name: saveEdit })
      await expect(saveBtn).toBeEnabled({ timeout: 15_000 })
      await saveBtn.click()
      await saveBtn.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {})
      await freshList(page, cfg.baseURL, entity.route)
      await expect(page.getByText(edited, { exact: false }).first()).toBeVisible({ timeout: 15_000 })

      // ---- DELETE ----
      await page.getByText(edited, { exact: false }).first().click()
      await trashButton(page).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 10_000 })
      await dialogConfirm(page, deleteLabel).click()
      await page.waitForTimeout(1000)
      await freshList(page, cfg.baseURL, entity.route)
      await expect(page.getByText(edited, { exact: false })).toHaveCount(0, { timeout: 15_000 })
    })

    if (entity.cleanup) {
      const { table, column, prefix } = entity.cleanup
      test.afterAll(async () => {
        // Best-effort teardown — remove any row a failed run left behind.
        const owner = ownerUser(cfg)
        const sb = await backendClient().authed(owner.email, owner.password)
        const { data } = await sb.from(table).select('id').ilike(column, `${prefix}%`)
        for (const row of data ?? []) await sb.from(table).delete().eq('id', (row as any).id)
      })
    }
  })
}
