// ---------------------------------------------------------------------------
// authSetup — a Playwright "setup project" factory. For each configured user it
// logs in through the real UI (English login chrome in every app: email +
// password + "Sign in") and persists a storageState the contract tests attach
// as. Landing on the shell landmark (a nav button) confirms the session.
//
// Deduped from the 5 auth.setup.ts / qa.setup.ts copies.
// ---------------------------------------------------------------------------
import { test as setup, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import type { TestingAppConfig } from '../config'

/**
 * Register one setup test per user. Call from an `*.setup.ts` file:
 *   import { authSetup } from '@fayz-ai/testing'
 *   authSetup(config)
 */
export function authSetup(cfg: TestingAppConfig): void {
  const loginButton = cfg.auth.loginButton ?? 'Sign in'

  for (const user of cfg.auth.users) {
    setup(`authenticate ${cfg.app} ${user.role} (${user.email})`, async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      fs.mkdirSync(path.dirname(user.storageState), { recursive: true })

      await page.goto(cfg.baseURL)
      await page.locator('input[type="email"]').fill(user.email)
      await page.locator('input[type="password"]').fill(user.password)
      await page.getByRole('button', { name: loginButton }).click()

      await expect(page.getByRole('button', { name: cfg.auth.landmark, exact: true }))
        .toBeVisible({ timeout: 30_000 })

      await context.storageState({ path: user.storageState })
      await context.close()
    })
  }
}
