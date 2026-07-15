import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { skill } from '../dist/commands/skill.js'

// Capture console output around a synchronous `fn` and return the joined text.
function withCapture(fn) {
  const logs = []
  const origLog = console.log
  const origErr = console.error
  console.log = (...a) => logs.push(a.join(' '))
  console.error = (...a) => logs.push(a.join(' '))
  try {
    const code = fn()
    return { code, out: logs.join('\n') }
  } finally {
    console.log = origLog
    console.error = origErr
  }
}

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'fayz-skill-'))
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

// ---------------------------------------------------------------------------
// list: officials appear before community and roadmap
// ---------------------------------------------------------------------------

test('skill list groups by tier with officials first', () => {
  const { code, out } = withCapture(() => skill('list', []))
  assert.equal(code, 0)
  const iOfficial = out.indexOf('fayz-descoberta')
  const iCommunity = out.indexOf('ui-ux-pro-max')
  const iRoadmap = out.indexOf('conceito-financeiro')
  assert.ok(iOfficial >= 0 && iCommunity >= 0 && iRoadmap >= 0, 'all tiers present')
  assert.ok(iOfficial < iCommunity, 'officials before community')
  assert.ok(iCommunity < iRoadmap, 'community before roadmap')
  assert.match(out, /developers\.fayz\.ai\/pt-BR\/docs\/ia\/skills/)
})

// ---------------------------------------------------------------------------
// list --json: parseable, officials first, stable shape
// ---------------------------------------------------------------------------

test('skill list --json is parseable and officials-first', () => {
  const { code, out } = withCapture(() => skill('list', ['--json']))
  assert.equal(code, 0)
  const parsed = JSON.parse(out)
  assert.ok(Array.isArray(parsed.skills))
  assert.equal(parsed.skills[0].tier, 'official')
  // every official comes before the first community entry
  const firstCommunity = parsed.skills.findIndex((s) => s.tier === 'community')
  assert.ok(firstCommunity > 0)
  for (let i = 0; i < firstCommunity; i++) assert.equal(parsed.skills[i].tier, 'official')
  assert.equal(parsed.docs, 'https://developers.fayz.ai/pt-BR/docs/ia/skills')
})

// ---------------------------------------------------------------------------
// add official: writes SKILL.md; respects and honors --force
// ---------------------------------------------------------------------------

test('skill add official writes .claude/skills/<id>/SKILL.md', () => {
  const fx = tempDir()
  try {
    const { code, out } = withCapture(() => skill('add', ['fayz-descoberta', fx.dir]))
    assert.equal(code, 0)
    const target = join(fx.dir, '.claude', 'skills', 'fayz-descoberta', 'SKILL.md')
    assert.ok(existsSync(target), 'SKILL.md written')
    const body = readFileSync(target, 'utf8')
    assert.match(body, /^---/) // frontmatter
    assert.match(body, /name: fayz-descoberta/)
    assert.match(out, /instalada em/)
  } finally {
    fx.cleanup()
  }
})

test('skill add official refuses to overwrite without --force, allows with --force', () => {
  const fx = tempDir()
  try {
    withCapture(() => skill('add', ['fayz-db', fx.dir]))
    // second add without --force → error, exit 1
    const second = withCapture(() => skill('add', ['fayz-db', fx.dir]))
    assert.equal(second.code, 1)
    assert.match(second.out, /--force/)
    // with --force → succeeds
    const forced = withCapture(() => skill('add', ['fayz-db', fx.dir, '--force']))
    assert.equal(forced.code, 0)
  } finally {
    fx.cleanup()
  }
})

// ---------------------------------------------------------------------------
// add community: prints `npx skills add` and creates NO files
// ---------------------------------------------------------------------------

test('skill add community prints npx skills add and writes no files', () => {
  const fx = tempDir()
  try {
    const { code, out } = withCapture(() => skill('add', ['ui-ux-pro-max', fx.dir]))
    assert.equal(code, 0)
    assert.match(out, /npx skills add nextlevelbuilder\/ui-ux-pro-max-skill/)
    // nothing installed on disk
    assert.ok(!existsSync(join(fx.dir, '.claude')), 'no .claude dir created for community')
    assert.equal(readdirSync(fx.dir).length, 0, 'temp dir untouched')
  } finally {
    fx.cleanup()
  }
})

// ---------------------------------------------------------------------------
// add unknown id → clear error, exit 1
// ---------------------------------------------------------------------------

test('skill add unknown id errors clearly', () => {
  const { code, out } = withCapture(() => skill('add', ['nope-nao-existe']))
  assert.equal(code, 1)
  assert.match(out, /não encontrada/)
  assert.match(out, /fayz skill list/)
})

// ---------------------------------------------------------------------------
// add roadmap → roadmap message, no files, exit 0
// ---------------------------------------------------------------------------

test('skill add roadmap prints a roadmap message and writes no files', () => {
  const fx = tempDir()
  try {
    const { code, out } = withCapture(() => skill('add', ['conceito-financeiro', fx.dir]))
    assert.equal(code, 0)
    assert.match(out, /roadmap/)
    assert.ok(!existsSync(join(fx.dir, '.claude')), 'no files for roadmap')
  } finally {
    fx.cleanup()
  }
})

// ---------------------------------------------------------------------------
// unknown subcommand → error
// ---------------------------------------------------------------------------

test('skill with unknown subcommand errors', () => {
  const { code, out } = withCapture(() => skill('frobnicate', []))
  assert.equal(code, 1)
  assert.match(out, /desconhecido/)
})
