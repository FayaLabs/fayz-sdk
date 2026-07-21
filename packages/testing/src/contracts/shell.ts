// ---------------------------------------------------------------------------
// shellContract — the cross-cutting shell behaviors that must hold in every app
// (owner session): settings save+persist, a plugin toggle persists, the
// workspace dropdown opens, an HONEST (never-faked) assistant FAB, and the
// notifications bell opens the inbox. Deduped from qa-regressions.spec.ts.
//
// Owner = the SDK shell itself, so this contract graduates naturally toward a
// `packages/saas/testing` home if the shell ever wants to own its own tests.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test'
import type { TestingAppConfig } from '../config'
import { strings } from '../fixtures/i18n'
import { gotoRoute } from '../fixtures/selectors'
import { sdkTags } from './util'

export function shellContract(cfg: TestingAppConfig): void {
  const shell = cfg.modules.shell
  if (!shell) return
  const module = shell.module ?? 'shell'
  const s = strings(cfg.locale)
  const tags = sdkTags(cfg, module)

  test.describe(`[${cfg.app}] shell contract`, () => {
    if (shell.settings) {
      const { route, nameSelector } = shell.settings
      test('company settings save and persist across reload', tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, route)
        const name = page.locator(nameSelector).first()
        await expect(name).toBeVisible({ timeout: 20_000 })
        // Wait for hydration before reading — filling mid-hydration loses the write.
        await expect(name).not.toHaveValue('', { timeout: 20_000 })
        const original = await name.inputValue()
        const probe = `QA Persist ${Date.now()}`
        try {
          await name.fill(probe)
          await page.getByRole('button', { name: s.saveEdit }).first().click()
          await page.waitForTimeout(1500)
          await page.reload()
          await expect(page.locator(nameSelector).first()).toHaveValue(probe, { timeout: 20_000 })
        } finally {
          // Restore — never write an empty value (guards tenants.name).
          if (original) {
            await page.locator(nameSelector).first().fill(original)
            await page.getByRole('button', { name: s.saveEdit }).first().click()
            await page.waitForTimeout(1000)
          }
        }
      })
    }

    if (shell.pluginToggle) {
      const { route, sectionButton } = shell.pluginToggle
      test('a plugin settings toggle persists across reload', tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, route)
        await page.getByRole('button', { name: sectionButton, exact: true }).first().click()
        const sw = page.getByRole('switch').first()
        await expect(sw).toBeVisible({ timeout: 15_000 })
        const before = await sw.getAttribute('aria-checked')
        const flipped = before === 'true' ? 'false' : 'true'
        try {
          await sw.click()
          await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', flipped)
          await page.waitForTimeout(1000)
          await page.reload()
          await expect(page.getByRole('switch').first())
            .toHaveAttribute('aria-checked', flipped, { timeout: 20_000 })
        } finally {
          const restore = page.getByRole('switch').first()
          if ((await restore.getAttribute('aria-checked')) === flipped) {
            await restore.click()
            await page.waitForTimeout(800)
          }
        }
      })
    }

    if (shell.fab) {
      const openLabel = shell.fab.openLabel ?? s.fabOpen
      const unconfigured = shell.fab.unconfigured ?? s.fabUnconfigured
      test('the assistant FAB is honest (never a fake answer)', tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, cfg.modules.crud?.[0]?.route ?? '/')
        await page.getByRole('button', { name: openLabel }).click()
        await expect(page.getByText(unconfigured)).toBeVisible({ timeout: 15_000 })
      })
    }

    // The SDK's NotificationBell only mounts in the SIDEBAR layout; topbar apps
    // have no sino — the contract skips the bell test there automatically.
    if (shell.bell && cfg.layout === 'sidebar') {
      const bellLabel = shell.bell.label ?? s.bell
      const inbox = shell.bell.inbox ?? s.inbox
      test('the notifications bell opens the inbox', tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, cfg.modules.crud?.[0]?.route ?? '/')
        await page.getByRole('button', { name: bellLabel }).click()
        const marker = typeof inbox === 'string'
          ? page.getByText(inbox, { exact: false }).first()
          : page.getByText(inbox).first()
        await expect(marker).toBeVisible({ timeout: 10_000 })
      })
    }

    if (shell.workspace) {
      const { trigger, menuText } = shell.workspace
      const menu = menuText ?? s.workspacesMenu
      test('the workspace dropdown opens without crashing', tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, cfg.modules.crud?.[0]?.route ?? '/')
        if (cfg.shellLandmark) {
          await expect(page.getByRole('button', { name: cfg.shellLandmark, exact: true }))
            .toBeVisible({ timeout: 20_000 })
        }
        await page.locator(trigger).first().click()
        const marker = typeof menu === 'string'
          ? page.getByText(menu, { exact: false }).first()
          : page.getByText(menu).first()
        await expect(marker).toBeVisible({ timeout: 10_000 })
      })
    }
  })
}
