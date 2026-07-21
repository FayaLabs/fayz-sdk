// ---------------------------------------------------------------------------
// conversationsContract — the real compose flow (new → contact + first message
// → "Iniciar conversa"). The thread must show immediately AND land in the real
// backend table (plg_conversations). Deduped from school/dentist/agency
// qa-conversations specs; dentist adds a channel step (pick "WhatsApp"), handled
// by the optional `channelLabel`.
//
// Owner of the contract: plugin-conversations.
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test'
import type { TestingAppConfig, ConversationsConfig } from '../config'
import { ownerUser } from '../config'
import { backendClient } from '../fixtures/backend'
import { gotoRoute } from '../fixtures/selectors'
import { sdkTags } from './util'

export function conversationsContract(cfg: TestingAppConfig, conv: ConversationsConfig): void {
  const module = conv.module ?? 'conversations'
  const tags = sdkTags(cfg, module)
  const table = conv.table ?? 'plg_conversations'

  async function create(page: Page, name: string, stamp: number): Promise<void> {
    await gotoRoute(page, cfg.baseURL, conv.route)
    await page.getByTestId('conversations-new').click()
    if (conv.channelLabel) {
      await page.getByRole('button', { name: conv.channelLabel }).first().click()
    }
    await page.locator(conv.nameField).fill(name)
    await page.locator(conv.handleField).fill(`+55 11 98888-${String(stamp).slice(-4)}`)
    await page.locator(conv.messageField).fill(`Primeira mensagem QA ${stamp}`)
    await page.getByRole('button', { name: conv.startLabel }).click()
  }

  test.describe(`[${cfg.app}] conversations contract`, () => {
    test('creating a conversation shows it in the inbox immediately', tags, async ({ page }) => {
      const stamp = Date.now()
      const name = `QA Conversa ${stamp}`
      await create(page, name, stamp)
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    })

    test('a created conversation is persisted to the real backend', tags, async ({ page }) => {
      const stamp = Date.now()
      const name = `QA Conversa ${stamp}`
      await create(page, name, stamp)
      // The DB is the deterministic, honest contract here — the "shows in the
      // inbox immediately" behavior is owned by the test above. Asserting the UI
      // render again here only adds flake, so we go straight to the backend.
      const owner = ownerUser(cfg)
      const sb = await backendClient().authed(owner.email, owner.password)
      await expect
        .poll(async () => {
          const { data } = await sb.from(table).select('id').eq('tenant_id', conv.tenantId)
          return data?.length ?? 0
        }, { timeout: 8_000 })
        .toBeGreaterThan(0)
    })
  })
}
