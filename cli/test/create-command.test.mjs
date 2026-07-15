import { test } from 'node:test'
import assert from 'node:assert/strict'
import { create } from '../dist/commands/create.js'

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

test('create --help prints usage and exits 0', () => {
  const { code, out } = withCapture(() => create('--help', ''))
  assert.equal(code, 0)
  assert.match(out, /fayz create/)
  assert.match(out, /storefront/)
  assert.match(out, /admin/)
  assert.match(out, /member/)
  assert.match(out, /create plugin <name>/)
  assert.match(out, /Examples:/)
})

test('create admin --help prints usage and exits 0 (help flag after kind)', () => {
  const { code, out } = withCapture(() => create('admin', '--help'))
  assert.equal(code, 0)
  assert.match(out, /Usage:/)
  assert.match(out, /storefront/)
})

test('create -h short flag prints usage and exits 0', () => {
  const { code, out } = withCapture(() => create('-h', ''))
  assert.equal(code, 0)
  assert.match(out, /fayz create/)
})

test('create with no kind prints usage and exits 0', () => {
  const { code, out } = withCapture(() => create('', ''))
  assert.equal(code, 0)
  assert.match(out, /Usage:/)
})

test('create with unknown kind still errors (exit 1)', () => {
  const { code, out } = withCapture(() => create('bogus', 'x'))
  assert.equal(code, 1)
  assert.match(out, /Unknown kind/)
})

test('create with valid kind but no name still errors (exit 1)', () => {
  const { code, out } = withCapture(() => create('storefront', ''))
  assert.equal(code, 1)
  assert.match(out, /kebab-case/)
})
