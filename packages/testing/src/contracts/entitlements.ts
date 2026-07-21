// ---------------------------------------------------------------------------
// entitlementsContract — the plan × role composition the whole entitlements
// foundation exists to serve. Split into two serial, owner-driven groups so a
// gap in one axis (e.g. an unenforced quantity limit) doesn't mask the other:
//
//   Group 1 — plan features (no limit dependency):
//     (a) plan-gated feature  → the nav item stays (freemium discovery) with a
//         premium Crown badge, and the route renders the UpgradePrompt ("Premium
//         feature"/"Recurso premium") — NOT the role AccessDenied ("Acesso
//         restrito"). Role allows, plan denies ⇒ paywall, not a 403.
//     (d) menu badge          → the plan pill in the account menu tracks the
//         plan across each flip (free vs paid name).
//     (e) role × plan         → a RESTRICTED user (no role grant for the feature)
//         under the free-test plan still has the module HIDDEN from nav — role
//         hiding wins over the plan's premium badge.
//
//   Group 2 — quantity limit:
//     (b) limit cap           → creating up to the plan cap succeeds; the NEXT
//         "+ Add" opens the global UpgradeModal (dialog with the limit copy) and
//         the row is NOT persisted (proved by an authenticated count).
//     (c) upgrade unblocks    → flip to the paid plan (lifts the cap) → the same
//         create now succeeds.
//
// The lever is `tenants.plan` (setTenantPlan): an authenticated UPDATE + a reload
// re-hydrates org.plan through the access engine. Each group captures the
// ORIGINAL plan up-front and ALWAYS restores it in afterAll, and every created
// row is swept — a run leaves the tenant exactly as it found it. Serial + the
// app's workers:1 keep the shared-tenant flip from racing other suites.
//
// Owner of the contract: packages/saas (the access engine lives in the SaaS
// layer; the plan × role resolver is a SaaS concern).
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test'
import type { TestingAppConfig, EntitlementsConfig } from '../config'
import { strings } from '../fixtures/i18n'
import { ownerUser } from '../config'
import {
  backendClient, getTenantPlan, setTenantPlan, countTenantRows, type SupabaseClient,
} from '../fixtures/backend'
import { gotoRoute, navItem } from '../fixtures/selectors'
import { sdkTags } from './util'

// Locale-spanning matchers — the contract serves both pt-BR and en apps, so the
// upgrade-surface copy is matched by a bilingual regex rather than the config.
const UPGRADE_TITLE = /Recurso premium|Premium feature/i
const LIMIT_REACHED = /atingiu o limite|reached the .* limit/i

export function entitlementsContract(cfg: TestingAppConfig, ent: EntitlementsConfig): void {
  const module = ent.module ?? 'entitlements'
  const s = strings(cfg.locale)
  const tags = sdkTags(cfg, module)
  const owner = ownerUser(cfg)

  const { tenantId, planFlip, planGatedFeature: feat, limitProbe: probe } = ent
  const namePrefix = probe.namePrefix ?? 'QA Ent'
  const accountTrigger = ent.accountTrigger ?? 'button[aria-haspopup="menu"]'

  let sb: SupabaseClient | undefined
  const created: string[] = []

  async function client(): Promise<SupabaseClient> {
    if (!sb) sb = await backendClient().authed(owner.email, owner.password)
    return sb
  }

  /** Flip the tenant plan, then hard-reload `route` so the app re-hydrates the
   *  org (and thus the access engine) with the new plan. */
  async function applyPlan(page: Page, planId: string, route: string): Promise<void> {
    await setTenantPlan(await client(), tenantId, planId)
    await gotoRoute(page, cfg.baseURL, route)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
  }

  async function countRows(): Promise<number> {
    return countTenantRows(await client(), probe.count.table, tenantId, { kind: probe.count.kind })
  }

  // =========================================================================
  // Group 1 — plan-gated feature (paywall) + role × plan composition
  // =========================================================================
  test.describe.serial(`[${cfg.app}] entitlements — plan features`, () => {
    let originalPlan: string | null = null

    test.beforeAll(async () => {
      originalPlan = await getTenantPlan(await client(), tenantId)
    })
    test.afterAll(async () => {
      if (sb && originalPlan !== null) await setTenantPlan(sb, tenantId, originalPlan)
    })

    // ---- (a) plan-gated feature → premium badge + UpgradePrompt (≠ role gate) --
    test('plan-gated feature shows a premium badge and paywalls the route', tags, async ({ page }) => {
      await applyPlan(page, planFlip.freeTestPlanId, feat.route)

      // The route renders the plan paywall (UpgradePrompt), NOT the role gate.
      await expect(page.getByRole('heading', { name: UPGRADE_TITLE }).first())
        .toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(s.restricted, { exact: false })).toHaveCount(0)

      // Nav keeps the item (freemium discovery) with a Crown badge.
      const item = navItem(page, feat.navLabel).first()
      await expect(item).toBeVisible({ timeout: 15_000 })
      await expect(item.locator('svg[class*="lucide-crown"]')).toBeVisible({ timeout: 15_000 })
    })

    // ---- (e) role × plan composition — role hiding beats the premium badge ----
    test.describe('restricted user under the free-test plan', () => {
      test.use({ storageState: ent.compose.restrictedStorageState })

      test.beforeAll(async () => {
        await setTenantPlan(await client(), tenantId, planFlip.freeTestPlanId)
      })

      test('a role-hidden module stays hidden even when the plan would badge it', tags, async ({ page }) => {
        await gotoRoute(page, cfg.baseURL, ent.compose.landingRoute)
        await page.reload()
        await page.waitForLoadState('domcontentloaded')
        // The restricted user lacks the feature's role grant → the item is gone
        // from the nav ENTIRELY (role hiding > the plan's premium discovery badge).
        await expect(navItem(page, feat.navLabel)).toHaveCount(0)
      })
    })
  })

  // =========================================================================
  // Group 2 — account-menu plan badge tracks the plan across flips
  // =========================================================================
  test.describe.serial(`[${cfg.app}] entitlements — plan badge`, () => {
    let originalPlan: string | null = null

    test.beforeAll(async () => {
      originalPlan = await getTenantPlan(await client(), tenantId)
    })
    test.afterAll(async () => {
      if (sb && originalPlan !== null) await setTenantPlan(sb, tenantId, originalPlan)
    })

    // Open each dropdown trigger in turn until the plan pill (by name) shows —
    // robust to which of the sidebar's menus (workspace switcher vs account) is
    // the account menu. Returns whether the label was found.
    async function badgeVisible(page: Page, planName: string): Promise<boolean> {
      await gotoRoute(page, cfg.baseURL, probe.route)
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      const triggers = page.locator(accountTrigger)
      const n = await triggers.count()
      for (let i = 0; i < n; i++) {
        await triggers.nth(i).click()
        // Wait for the dropdown to render (Radix animates open) before deciding —
        // a bare count() would race the animation and read 0.
        try {
          await expect(page.getByText(planName, { exact: false }).first())
            .toBeVisible({ timeout: 3000 })
          return true
        } catch {
          await page.keyboard.press('Escape').catch(() => {})
        }
      }
      return false
    }

    test('the account-menu plan badge reflects the active plan', tags, async ({ page }) => {
      if (!planFlip.freeTestPlanName || !planFlip.paidPlanName) test.skip()

      await setTenantPlan(await client(), tenantId, planFlip.freeTestPlanId)
      expect(await badgeVisible(page, planFlip.freeTestPlanName!)).toBeTruthy()

      await setTenantPlan(await client(), tenantId, planFlip.paidPlanId)
      expect(await badgeVisible(page, planFlip.paidPlanName!)).toBeTruthy()
    })
  })

  // =========================================================================
  // Group 2 — quantity limit (cap block, upgrade unblock)
  // =========================================================================
  test.describe.serial(`[${cfg.app}] entitlements — quantity limit`, () => {
    let originalPlan: string | null = null

    test.beforeAll(async () => {
      originalPlan = await getTenantPlan(await client(), tenantId)
    })
    test.afterAll(async () => {
      // Restore the plan FIRST (the important invariant), then best-effort sweep
      // every row this run created so the tenant is left untouched.
      try {
        if (sb && originalPlan !== null) await setTenantPlan(sb, tenantId, originalPlan)
      } finally {
        if (sb) {
          for (const name of created) {
            const { data } = await sb
              .from(probe.count.table).select('id')
              .eq('tenant_id', tenantId).eq('name', name)
            for (const row of data ?? []) {
              const id = (row as { id: string }).id
              await sb.from('appointments').delete().eq('party_id', id).then(() => {}, () => {})
              await sb.from(probe.count.table).delete().eq('id', id).then(() => {}, () => {})
            }
          }
        }
      }
    })

    // ---- (b) quantity limit → create up to cap, then UpgradeModal + no persist -
    test('creating past the plan cap opens the UpgradeModal and does not persist', tags, async ({ page }) => {
      await applyPlan(page, planFlip.freeTestPlanId, probe.route)

      const used0 = await countRows()
      const remaining = Math.max(0, probe.capForTest - used0)
      const stamp = Date.now()
      const base = `${namePrefix} ${stamp}`

      // Create rows until the cap is reached (0 when the tenant is already at it).
      for (let i = 0; i < remaining; i++) {
        const name = `${base}-${i}`
        await gotoRoute(page, cfg.baseURL, probe.route)
        await page.getByRole('button', { name: probe.addLabel }).first().click()
        await probe.fillEntity(page, name)
        created.push(name)
        // Authoritative success proof: the row lands in the DB.
        await expect
          .poll(async () => countTenantRows(
            await client(), probe.count.table, tenantId,
            { kind: probe.count.kind, nameColumn: probe.count.column, namePrefix: name },
          ), { timeout: 15_000 })
          .toBeGreaterThan(0)
      }

      // Now at the cap. Land on the list and wait for the LimitGate to dim the
      // "+ Add" trigger (proves useLimit resolved atLimit), then click it.
      await gotoRoute(page, cfg.baseURL, probe.route)
      await page.waitForLoadState('networkidle').catch(() => {})
      await expect(page.locator('[data-limit-reached]').first()).toBeVisible({ timeout: 20_000 })

      const countBeforeBlock = await countRows()
      // force: the LimitGate dims the inner button (pointer-events:none) and
      // intercepts the click on the wrapper to open the modal.
      await page.getByRole('button', { name: probe.addLabel }).first().click({ force: true })

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 15_000 })
      await expect(dialog.getByText(LIMIT_REACHED).first()).toBeVisible({ timeout: 15_000 })

      // Nothing was written — the guard blocked BEFORE any insert.
      expect(await countRows()).toBe(countBeforeBlock)
    })

    // ---- (c) upgrade unblocks → the same create now succeeds ------------------
    test('upgrading to a paid plan unblocks the create', tags, async ({ page }) => {
      await applyPlan(page, planFlip.paidPlanId, probe.route)

      const name = `${namePrefix} ${Date.now()}-upgraded`
      await page.getByRole('button', { name: probe.addLabel }).first().click()
      await probe.fillEntity(page, name)
      created.push(name)

      await expect
        .poll(async () => countTenantRows(
          await client(), probe.count.table, tenantId,
          { kind: probe.count.kind, nameColumn: probe.count.column, namePrefix: name },
        ), { timeout: 15_000 })
        .toBeGreaterThan(0)
    })
  })
}
