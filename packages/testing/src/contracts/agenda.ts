// ---------------------------------------------------------------------------
// agendaContract — booking create/edit/delete over the Agenda plugin, proved
// against the `appointments` table (the agenda's own data source), not just the
// UI. Deduped from school/beauty/dentist/agency qa-booking specs; the booking
// "kind" is parameterized (class / appointment / meeting) via the pickers —
// omit `service` for a client-only kind (e.g. agency Meeting), omit `client`
// for a resource-only block.
//
// Owner of the contract: plugin-agenda. Graduates to `plugins/plugin-agenda/
// testing` when the plugin wants to version its own booking contract.
// ---------------------------------------------------------------------------
import { test, expect, type Page, type Locator } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TestingAppConfig, AgendaConfig, AgendaPicker } from '../config'
import { strings } from '../fixtures/i18n'
import { ownerUser } from '../config'
import { backendClient } from '../fixtures/backend'
import { gotoRoute } from '../fixtures/selectors'
import { sdkTags } from './util'

/** Drive one picker inside the booking modal. Search pickers resolve their
 *  result in the body-level role=listbox portal; direct pickers click the
 *  option inside the modal. */
async function pick(page: Page, modal: Locator, picker: AgendaPicker): Promise<void> {
  await modal.getByRole('button', { name: picker.trigger }).click()
  if (picker.searchPlaceholder) {
    await modal.getByPlaceholder(picker.searchPlaceholder).fill(picker.value)
    await page.waitForTimeout(800)
    await page.getByRole('listbox').getByText(picker.value, { exact: false }).first().click()
  } else {
    await modal.getByRole('button', { name: new RegExp(escapeRe(picker.value)) }).click()
  }
  await expect(modal.getByText(picker.value, { exact: false }).first()).toBeVisible()
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function agendaContract(cfg: TestingAppConfig, agenda: AgendaConfig): void {
  const module = agenda.module ?? 'agenda'
  const s = strings(cfg.locale)
  const tags = sdkTags(cfg, module)
  const table = agenda.table ?? 'appointments'
  const notesCol = agenda.notesColumn ?? 'notes'
  const notePrefix = agenda.notePrefix ?? 'QA booking'
  const reopenText = agenda.reopenText ?? agenda.client?.value ?? agenda.professional.value

  async function apptsByNote(sb: SupabaseClient, note: string) {
    const { data, error } = await sb
      .from(table).select('id').eq('tenant_id', agenda.tenantId).eq(notesCol, note)
    if (error) throw new Error(`apptsByNote: ${error.message}`)
    return data ?? []
  }

  async function createBooking(page: Page, note: string): Promise<void> {
    await gotoRoute(page, cfg.baseURL, agenda.route)
    await page.getByRole('button', { name: agenda.createLabel, exact: true }).first().click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 15_000 })

    await pick(page, modal, agenda.professional)
    if (agenda.client) await pick(page, modal, agenda.client)
    if (agenda.service) await pick(page, modal, agenda.service)

    await expect(modal.getByRole('button', { name: s.save, exact: true }))
      .toBeEnabled({ timeout: 10_000 })
    await modal.getByText(agenda.notesToggle, { exact: false }).first().click()
    await modal.getByPlaceholder(agenda.notesPlaceholder).fill(note)
    await modal.getByRole('button', { name: s.save, exact: true }).click()
    await expect(modal).toBeHidden({ timeout: 15_000 })
  }

  async function reopen(page: Page): Promise<Locator> {
    await gotoRoute(page, cfg.baseURL, agenda.route)
    const event = page.getByText(reopenText, { exact: false }).first()
    await expect(event).toBeVisible({ timeout: 15_000 })
    await event.scrollIntoViewIfNeeded()
    await event.dblclick()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 10_000 })
    return modal
  }

  test.describe(`[${cfg.app}] agenda contract`, () => {
    let sb: SupabaseClient

    test.beforeAll(async () => {
      const owner = ownerUser(cfg)
      sb = await backendClient().authed(owner.email, owner.password)
    })

    async function cleanup() {
      const { data } = await sb
        .from(table).select('id').eq('tenant_id', agenda.tenantId).ilike(notesCol, `${notePrefix}%`)
      for (const r of data ?? []) await sb.from(table).delete().eq('id', (r as any).id)
    }
    test.afterEach(async () => { await cleanup() })
    test.afterAll(async () => { await cleanup() })

    test('create a booking that persists to the appointments table', tags, async ({ page }) => {
      const note = `${notePrefix} create ${Date.now()}`
      await createBooking(page, note)
      await expect
        .poll(async () => (await apptsByNote(sb, note)).length, { timeout: 15_000 })
        .toBeGreaterThan(0)
    })

    test(`editing a booking enables "${s.update}"`, tags, async ({ page }) => {
      const note = `${notePrefix} edit ${Date.now()}`
      await createBooking(page, note)
      const modal = await reopen(page)
      await modal.getByPlaceholder(agenda.notesPlaceholder).fill(`${note} EDIT`)
      // Generous timeout: the edit modal hydrates order_items on the single-record
      // read before canSubmit flips true, so enablement can lag the fill.
      await expect(modal.getByRole('button', { name: s.update })).toBeEnabled({ timeout: 15_000 })
    })

    test(`deleting a booking via "${s.delete}" removes it`, tags, async ({ page }) => {
      const note = `${notePrefix} del ${Date.now()}`
      await createBooking(page, note)
      const modal = await reopen(page)
      // Two-step inline confirm: the footer link opens the confirm row, then the
      // destructive button fires the delete. Both share the accessible name but
      // never coexist, so the same locator resolves to each in turn.
      await modal.getByRole('button', { name: s.delete, exact: true }).click()
      await modal.getByRole('button', { name: s.delete, exact: true }).click()
      await expect
        .poll(async () => (await apptsByNote(sb, note)).length, { timeout: 8_000 })
        .toBe(0)
    })
  })
}
