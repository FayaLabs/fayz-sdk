import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildMigrationPlan, MigrationPlanError, pluginPackageName } from '../dist/lib/migration-plan.js'

// ---------------------------------------------------------------------------
// Fixture builder: a fake app dir with a fake node_modules so require.resolve
// finds installed @fayz-ai/* packages exactly as it would in a real app.
// ---------------------------------------------------------------------------
function file(path, content = '-- sql\n') {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content)
}

function pkg(root, name, files = []) {
  const dir = join(root, 'node_modules', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '0.0.0' }))
  for (const rel of files) file(join(dir, rel))
  return dir
}

/**
 * @param opts.db          array of migration filenames for @fayz-ai/db (or null to omit the package)
 * @param opts.plugins     { [pluginId]: string[] | 'installed-empty' | 'absent' }
 * @param opts.drizzle     array of filenames under app drizzle/
 * @param opts.seed        boolean — write supabase/seed-saas-core.sql
 * @param opts.manifest    boolean — write app.manifest.json (plugin ids from opts.plugins order)
 * @param opts.incubator   { [dirName]: string[] } — app-local src/plugins/<dir>/migrations
 */
function makeApp(opts = {}) {
  const root = mkdtempSync(join(tmpdir(), 'a3a-fixture-'))

  // ① spine
  if (opts.db !== null) {
    pkg(root, '@fayz-ai/db', (opts.db ?? []).map((f) => `migrations/${f}`))
  }

  // ④ plugins
  const pluginOrder = []
  for (const [id, spec] of Object.entries(opts.plugins ?? {})) {
    pluginOrder.push(id)
    if (spec === 'absent') continue // not installed
    const files = spec === 'installed-empty' ? [] : spec
    pkg(root, pluginPackageName(id), files.map((f) => `src/migrations/${f}`))
  }

  // ② drizzle
  for (const f of opts.drizzle ?? []) file(join(root, 'drizzle', f))

  // ③ seed
  if (opts.seed) file(join(root, 'supabase', 'seed-saas-core.sql'))

  // manifest
  if (opts.manifest) {
    const manifest = {
      manifestVersion: 2,
      id: 'fixture',
      name: 'Fixture',
      surfaces: {
        admin: { scaffold: 'admin', plugins: pluginOrder.map((id) => ({ id })) },
      },
    }
    writeFileSync(join(root, 'app.manifest.json'), JSON.stringify(manifest))
  }

  // ⑤ incubator
  for (const [dir, files] of Object.entries(opts.incubator ?? {})) {
    for (const f of files) file(join(root, 'src', 'plugins', dir, 'migrations', f))
  }

  return root
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------

test('full plan ordering: spine → drizzle → seed → plugin → incubator', () => {
  const app = makeApp({
    db: ['001_a.sql', '002_b.sql'],
    drizzle: ['0000_x.sql', '0001_y.sql'],
    seed: true,
    manifest: true,
    plugins: {
      crm: ['001_crm.sql', '002_crm.sql'],
      dashboard: 'installed-empty', // enabled but ships no migrations → noted, no step
    },
    incubator: { resto: ['001_menu.sql'] },
  })
  try {
    const plan = buildMigrationPlan(app)
    assert.deepEqual(
      plan.steps.map((s) => [s.order, s.source, s.id, s.files.length]),
      [
        [1, 'spine', '@fayz-ai/db', 2],
        [2, 'drizzle', 'drizzle', 2],
        [3, 'seed', 'supabase/seed-saas-core.sql', 1],
        [4, 'plugin', 'crm', 2],
        [5, 'incubator', 'resto', 1],
      ],
    )
    assert.equal(plan.totalFiles, 8)
    // dashboard enabled but empty → a note, not a step
    assert.ok(plan.notes.some((n) => n.includes("plugin 'dashboard'")))
    // files are sorted by filename within a step
    assert.ok(plan.steps[0].files[0].endsWith('001_a.sql'))
  } finally {
    cleanup(app)
  }
})

test('spineOnly keeps only the spine step', () => {
  const app = makeApp({
    db: ['001_a.sql'],
    drizzle: ['0000_x.sql'],
    seed: true,
    manifest: true,
    plugins: { crm: ['001_crm.sql'] },
    incubator: { resto: ['001_menu.sql'] },
  })
  try {
    const plan = buildMigrationPlan(app, { spineOnly: true })
    assert.deepEqual(plan.steps.map((s) => s.source), ['spine'])
    assert.equal(plan.totalFiles, 1)
  } finally {
    cleanup(app)
  }
})

test('pluginsOnly keeps only plugin + incubator steps', () => {
  const app = makeApp({
    db: ['001_a.sql'],
    drizzle: ['0000_x.sql'],
    seed: true,
    manifest: true,
    plugins: { crm: ['001_crm.sql'] },
    incubator: { resto: ['001_menu.sql'] },
  })
  try {
    const plan = buildMigrationPlan(app, { pluginsOnly: true })
    assert.deepEqual(
      plan.steps.map((s) => [s.order, s.source, s.id]),
      [
        [1, 'plugin', 'crm'],
        [2, 'incubator', 'resto'],
      ],
    )
  } finally {
    cleanup(app)
  }
})

test('onlyPlugins restricts the plugin step and notes unknown ids', () => {
  const app = makeApp({
    db: ['001_a.sql'],
    manifest: true,
    plugins: { crm: ['001_crm.sql'], financial: ['001_fin.sql'] },
  })
  try {
    const plan = buildMigrationPlan(app, { onlyPlugins: ['crm', 'ghost'] })
    const pluginSteps = plan.steps.filter((s) => s.source === 'plugin')
    assert.deepEqual(pluginSteps.map((s) => s.id), ['crm'])
    assert.ok(plan.notes.some((n) => n.includes("'ghost'")))
  } finally {
    cleanup(app)
  }
})

test('enabled:false plugin refs are skipped', () => {
  const app = makeApp({ db: ['001_a.sql'], plugins: { crm: ['001_crm.sql'] } })
  // hand-write a manifest with crm disabled
  writeFileSync(
    join(app, 'app.manifest.json'),
    JSON.stringify({
      manifestVersion: 2,
      id: 'x',
      name: 'X',
      surfaces: { admin: { scaffold: 'admin', plugins: [{ id: 'crm', enabled: false }] } },
    }),
  )
  try {
    const plan = buildMigrationPlan(app)
    assert.equal(plan.steps.filter((s) => s.source === 'plugin').length, 0)
  } finally {
    cleanup(app)
  }
})

test('no-manifest (code-config) app: core steps present, plugin step skipped with note', () => {
  const app = makeApp({ db: ['001_a.sql'], drizzle: ['0000_x.sql'], manifest: false })
  try {
    const plan = buildMigrationPlan(app)
    assert.deepEqual(plan.steps.map((s) => s.source), ['spine', 'drizzle'])
    assert.ok(plan.notes.some((n) => n.includes('code-config')))
  } finally {
    cleanup(app)
  }
})

test('installed @fayz-ai/db with no migrations → empty spine step + note', () => {
  const app = makeApp({ db: [], manifest: false })
  try {
    const plan = buildMigrationPlan(app)
    const spine = plan.steps.find((s) => s.source === 'spine')
    assert.ok(spine)
    assert.equal(spine.files.length, 0)
    assert.ok(plan.notes.some((n) => n.includes('ships no migrations')))
  } finally {
    cleanup(app)
  }
})

test('missing @fayz-ai/db → actionable MigrationPlanError', () => {
  const app = makeApp({ db: null, manifest: false })
  try {
    assert.throws(() => buildMigrationPlan(app), (err) => {
      assert.ok(err instanceof MigrationPlanError)
      assert.match(err.message, /npm install @fayz-ai\/db/)
      return true
    })
  } finally {
    cleanup(app)
  }
})

test('plugin package not installed (platform-bundled) → noted, not fatal', () => {
  const app = makeApp({ db: ['001_a.sql'], manifest: true, plugins: { dashboard: 'absent' } })
  try {
    const plan = buildMigrationPlan(app)
    assert.equal(plan.steps.filter((s) => s.source === 'plugin').length, 0)
    assert.ok(plan.notes.some((n) => n.includes('not resolvable')))
  } finally {
    cleanup(app)
  }
})
