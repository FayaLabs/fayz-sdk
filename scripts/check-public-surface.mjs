#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const PUBLIC_PACKAGE_NAME = '@fayz-ai/sdk'
const problems = []

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

for (const group of ['packages', 'plugins']) {
  const groupDir = join(ROOT, group)
  if (!existsSync(groupDir)) continue

  for (const name of readdirSync(groupDir)) {
    const packageJsonPath = join(groupDir, name, 'package.json')
    if (!existsSync(packageJsonPath)) continue

    const manifest = readJson(packageJsonPath)
    if (manifest.name === PUBLIC_PACKAGE_NAME) {
      if (manifest.private === true) {
        problems.push(`${manifest.name} must remain publishable, but private is true`)
      }
      if (manifest.publishConfig?.access !== 'public') {
        problems.push(`${manifest.name} must keep publishConfig.access=public`)
      }
      continue
    }

    if (manifest.private !== true) {
      problems.push(`${manifest.name} must be private until dogfood promotes it to public API`)
    }
    if (manifest.publishConfig) {
      problems.push(`${manifest.name} must not declare publishConfig while internal`)
    }
  }
}

if (problems.length > 0) {
  console.error('Public surface check failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`Public surface check passed: only ${PUBLIC_PACKAGE_NAME} is publishable`)
