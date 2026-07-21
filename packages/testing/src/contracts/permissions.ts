// ---------------------------------------------------------------------------
// permissionsContract — a restricted profile must see a REDUCED surface vs the
// owner: nav items disappear, blocked routes answer the permission gate, and
// read-only pages omit the create button. Every expectation is declared by
// config (visibleNav / hiddenNav / blockedRoutes / readOnly), so the same
// factory serves every app + profile. Deduped from the 5 qa-permissions specs.
//
// The gate string follows the locale by default but is overridable — resto
// renders the EN "Access restricted" under a pt-BR shell.
//
// Owner of the contract: packages/saas (permissions live in the SaaS layer).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test'
import type { TestingAppConfig, PermissionsConfig } from '../config'
import { strings } from '../fixtures/i18n'
import { navItem, gotoRoute } from '../fixtures/selectors'
import { sdkTags } from './util'

export function permissionsContract(cfg: TestingAppConfig, perms: PermissionsConfig): void {
  const module = perms.module ?? 'permissions'
  const s = strings(cfg.locale)
  const tags = sdkTags(cfg, module)
  const gate = perms.restrictedText ?? s.restricted
  const r = perms.restricted

  test.describe(`[${cfg.app}] permissions — owner`, () => {
    if (perms.ownerNav?.length) {
      test('owner sees the full nav', tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, r.landingRoute)
        for (const label of perms.ownerNav!) {
          await expect(navItem(page, label).first()).toBeVisible({ timeout: 15_000 })
        }
      })
    }
    for (const create of perms.ownerCreate ?? []) {
      test(`owner can create at ${create.route}`, tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, create.route)
        await expect(page.getByRole('button', { name: create.button })).toBeVisible({ timeout: 15_000 })
      })
    }
  })

  test.describe(`[${cfg.app}] permissions — restricted`, () => {
    test.use({ storageState: r.storageState })

    test('restricted nav shows granted modules and hides the rest', tags, async ({ page }) => {
      await gotoRoute(page, cfg.baseURL, r.landingRoute)
      for (const label of r.visibleNav) {
        await expect(navItem(page, label)).toBeVisible({ timeout: 15_000 })
      }
      for (const label of r.hiddenNav) {
        await expect(navItem(page, label)).toHaveCount(0)
      }
    })

    if (r.blockedRoutes.length) {
      test('direct URL to a blocked module shows the permission gate', tags, async ({ page }) => {
        for (const route of r.blockedRoutes) {
          await gotoRoute(page, cfg.baseURL, route)
          await expect(page.getByText(gate, { exact: false })).toBeVisible({ timeout: 15_000 })
        }
      })
    }

    for (const ro of r.readOnly ?? []) {
      test(`read-only page ${ro.route} hides the create button`, tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, ro.route)
        await expect(page.getByText(ro.heading, { exact: false }).first()).toBeVisible({ timeout: 15_000 })
        await expect(page.getByRole('button', { name: ro.hiddenButton })).toHaveCount(0)
      })
    }
  })
}
