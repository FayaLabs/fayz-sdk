// ---------------------------------------------------------------------------
// Checkup reporter — a Playwright custom reporter that aggregates results by
// `@module:<id>` × kind (SDK contract vs local app test) and writes a
// human-legible e2e-report/CHECKUP.md.
//
// Wire it up alongside 'list' in playwright.config:
//   reporter: [
//     ['list'],
//     ['@fayz-ai/testing/reporter', { app: 'schoolsoft', installedModules: [...] }],
//   ]
//
// How a test is classified:
//   • module    — the `@module:<id>` tag (contracts add it; local specs may too).
//   • kind      — `@contract` ⇒ "SDK contract"; otherwise "local app test"
//                 (tests may add `@local` for clarity, but it is not required —
//                 anything without `@contract` is treated as local).
//   • installedModules (reporter option) that produced NO contract test are
//     listed as an explicit GAP, so the report grows on its own when a plugin is
//     added to the config without a contract yet.
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import type {
  Reporter, TestCase, TestResult, FullResult,
} from '@playwright/test/reporter'

interface CheckupOptions {
  /** App label for the report heading (defaults to the Playwright project or 'app'). */
  app?: string
  /** Output path (default 'e2e-report/CHECKUP.md'). */
  outputFile?: string
  /** Plugin ids installed in the app — any without a contract test is a GAP. */
  installedModules?: string[]
}

type Status = 'passed' | 'failed' | 'skipped'
interface Counts { passed: number; failed: number; skipped: number }
interface Cell { contract: Counts; local: Counts }

function emptyCounts(): Counts { return { passed: 0, failed: 0, skipped: 0 } }
function emptyCell(): Cell { return { contract: emptyCounts(), local: emptyCounts() } }

function normalize(status: TestResult['status']): Status {
  if (status === 'passed') return 'passed'
  if (status === 'skipped') return 'skipped'
  return 'failed' // failed | timedOut | interrupted
}

/** Render one (module, kind) cell: ❌ if any failed, ⏭ if all skipped, ✅ if
 *  all-passed, — if empty. Always shows passed/total. */
function cell(c: Counts): string {
  const total = c.passed + c.failed + c.skipped
  if (total === 0) return '—'
  if (c.failed > 0) return `❌ ${c.passed}/${total}`
  if (c.passed === 0) return `⏭ 0/${total}`
  return `✅ ${c.passed}/${total}`
}

export default class CheckupReporter implements Reporter {
  private readonly opts: CheckupOptions
  private readonly modules = new Map<string, Cell>()
  private readonly contractModules = new Set<string>()
  private readonly failures: { title: string; module: string }[] = []
  private appName: string | undefined
  private total = 0
  private tally: Counts = emptyCounts()

  constructor(options: CheckupOptions = {}) {
    this.opts = options
    this.appName = options.app
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const tags = tagsOf(test)
    const appTag = tags.find((t) => t.startsWith('@app:'))
    if (appTag && !this.appName) this.appName = appTag.slice('@app:'.length)

    const isContract = tags.includes('@contract')
    const moduleTag = tags.find((t) => t.startsWith('@module:'))
    const module = moduleTag ? moduleTag.slice('@module:'.length) : 'app'

    const status = normalize(result.status)
    // Only tally the LAST attempt of a test (retries): count on final result.
    if (result.retry < (test.results.length - 1)) return

    this.total++
    this.tally[status]++

    // Login/setup projects are infrastructure, not behavior coverage — count them
    // in the totals (so a broken login still surfaces) but keep them out of the
    // module matrix so it reads as real coverage. Detect via the Playwright
    // project name (setup projects) — the authSetup tests live in the package's
    // auth.ts, so a filename check alone would miss them.
    const projectName = (test.parent as unknown as { project?: () => { name?: string } | undefined })
      ?.project?.()?.name ?? ''
    const isSetup = /setup/i.test(projectName) || /\.setup\.[cm]?tsx?$/.test(test.location?.file ?? '')
    if (!isSetup) {
      const c = this.modules.get(module) ?? emptyCell()
      const bucket = isContract ? c.contract : c.local
      bucket[status]++
      this.modules.set(module, c)
      if (isContract) this.contractModules.add(module)
    }

    if (status === 'failed') {
      this.failures.push({ title: test.titlePath().slice(1).join(' › '), module })
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    const out = this.opts.outputFile ?? 'e2e-report/CHECKUP.md'
    const md = this.render(result)
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
    fs.writeFileSync(path.resolve(out), md, 'utf8')
    // A quiet one-liner so `list` output ends with where the report went.
    process.stdout.write(`\n[checkup] wrote ${out}\n`)
  }

  private render(result: FullResult): string {
    const app = this.appName ?? 'app'
    const when = new Date().toISOString().replace('T', ' ').slice(0, 16)
    const L: string[] = []

    L.push(`# Checkup — ${app}`)
    L.push('')
    const verdict = result.status === 'passed' ? '🟢 green'
      : result.status === 'failed' ? '🔴 failing'
      : `⚪ ${result.status}`
    L.push(
      `_${when} UTC · ${verdict} · ${this.total} tests · `
      + `${this.tally.passed} ✅ · ${this.tally.failed} ❌ · ${this.tally.skipped} ⏭_`,
    )
    L.push('')

    // ---- Module coverage matrix ----
    L.push('## Module coverage')
    L.push('')
    L.push('| Module | SDK contract | Local (app) |')
    L.push('|--------|--------------|-------------|')
    const names = [...this.modules.keys()].sort(orderModules)
    for (const name of names) {
      const c = this.modules.get(name)!
      const label = name === 'app' ? '_app (local, untagged)_' : `\`${name}\``
      L.push(`| ${label} | ${cell(c.contract)} | ${cell(c.local)} |`)
    }
    L.push('')

    // ---- Gaps: installed modules with no contract ----
    const installed = this.opts.installedModules ?? []
    const gaps = installed.filter((m) => !this.contractModules.has(m))
    L.push('## Installed modules without a contract')
    L.push('')
    if (installed.length === 0) {
      L.push('_No `installedModules` declared in the reporter options — pass the app\'s'
        + ' plugin list to surface coverage gaps automatically._')
    } else if (gaps.length === 0) {
      L.push('None — every installed module has at least one contract test. ✅')
    } else {
      for (const g of gaps) {
        L.push(`- \`${g}\` — installed but no contract test. Add a \`modules.${g}\``
          + ' block to the config to grow coverage.')
      }
    }
    L.push('')

    // ---- Failures ----
    L.push('## Failures')
    L.push('')
    if (this.failures.length === 0) {
      L.push('None. 🟢')
    } else {
      for (const f of this.failures) L.push(`- ❌ [\`${f.module}\`] ${f.title}`)
    }
    L.push('')

    return L.join('\n')
  }
}

/** Read a test's tags — from TestCase.tags (Playwright ≥1.42) with a title
 *  fallback for older runners. */
function tagsOf(test: TestCase): string[] {
  const fromApi = (test as unknown as { tags?: string[] }).tags
  if (Array.isArray(fromApi) && fromApi.length) return fromApi
  return (test.title.match(/@[\w:-]+/g) ?? [])
}

/** Stable module ordering: shell first, permissions last, others alphabetical,
 *  the untagged 'app' bucket at the very end. */
function orderModules(a: string, b: string): number {
  const rank = (m: string) =>
    m === 'shell' ? 0 : m === 'app' ? 100 : m === 'permissions' ? 90 : 50
  const ra = rank(a); const rb = rank(b)
  return ra !== rb ? ra - rb : a.localeCompare(b)
}
