// ---------------------------------------------------------------------------
// i18n- and layout-aware selector helpers shared by every contract. These wrap
// the handful of DOM patterns the SDK shell renders identically across apps:
// the SaveBar, the destructive confirm dialog, the trash icon, nav items
// (sidebar button vs topbar group), and stale-list hard reloads.
// ---------------------------------------------------------------------------
import { expect, type Page, type Locator } from '@playwright/test'

/** Hard-reload a list route — the SDK list cache is NOT invalidated on delete,
 *  so navigation alone can show a stale ghost row. Every list assertion reloads. */
export async function freshList(page: Page, baseURL: string, route: string): Promise<void> {
  const hash = route.startsWith('/#') ? route : `/#${route.startsWith('/') ? route : `/${route}`}`
  await page.goto(`${baseURL}${hash}`, { waitUntil: 'domcontentloaded' })
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
}

/** Navigate to a hash route (no reload). */
export async function gotoRoute(page: Page, baseURL: string, route: string): Promise<void> {
  const hash = route.startsWith('/#') ? route : `/#${route.startsWith('/') ? route : `/${route}`}`
  await page.goto(`${baseURL}${hash}`, { waitUntil: 'domcontentloaded' })
}

/** A nav item by exact accessible name. Works for both sidebar buttons and
 *  topbar group buttons (both render as role=button with the label). */
export function navItem(page: Page, label: string): Locator {
  return page.getByRole('button', { name: label, exact: true })
}

/** The destructive confirm button inside the open dialog. */
export function dialogConfirm(page: Page, label: string): Locator {
  return page.getByRole('dialog').getByRole('button', { name: label, exact: true })
}

/** The trash / delete icon button on a detail page (lucide-trash svg). */
export function trashButton(page: Page): Locator {
  return page.locator('button:has(svg[class*="lucide-trash"])').first()
}

/** Wait for a SaveBar button to disappear — the write settled and it is safe to
 *  navigate away (a premature navigation aborts the in-flight insert/update). */
export async function waitSaveSettled(page: Page, label: string, timeout = 15_000): Promise<void> {
  await expect(page.getByRole('button', { name: label, exact: true })).toBeHidden({ timeout })
}

/** Fill a CRUD field: prefer an explicit CSS selector (scoped to main), else a
 *  label. Returns the located input. */
export async function fillField(
  page: Page,
  spec: { selector?: string; label?: string },
  value: string,
): Promise<void> {
  let input: Locator
  if (spec.selector) {
    const scoped = spec.selector.includes(' ') || spec.selector.startsWith('#')
      ? spec.selector
      : `main ${spec.selector}`
    input = page.locator(scoped).first()
  } else if (spec.label) {
    input = page.getByLabel(spec.label).first()
  } else {
    throw new Error('[testing] CRUD field needs a `selector` or `label`')
  }
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(value)
}
