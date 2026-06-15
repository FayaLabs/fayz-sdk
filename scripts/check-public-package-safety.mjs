#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const TARGETS = process.argv.slice(2)
const PUBLIC_SCOPES = ['@fayz-ai/']

if (TARGETS.length === 0) {
  console.error('Usage: node scripts/check-public-package-safety.mjs <package-dir> [...]')
  process.exit(1)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function normalizeDir(target) {
  return target.startsWith(ROOT) ? target : resolve(ROOT, target)
}

function collectWorkspacePackages() {
  const packages = new Map()

  for (const group of ['packages', 'plugins']) {
    const groupDir = join(ROOT, group)
    if (!existsSync(groupDir)) continue

    for (const name of readdirSync(groupDir)) {
      const dir = join(groupDir, name)
      const packageJsonPath = join(dir, 'package.json')
      if (!existsSync(packageJsonPath)) continue

      const manifest = readJson(packageJsonPath)
      packages.set(manifest.name, {
        dir,
        manifest,
      })
    }
  }

  return packages
}

function dependencyEntries(manifest) {
  return [
    ...Object.entries(manifest.dependencies ?? {}),
    ...Object.entries(manifest.peerDependencies ?? {}),
    ...Object.entries(manifest.optionalDependencies ?? {}),
  ]
}

function isPublicWorkspacePackage(name, manifest) {
  return PUBLIC_SCOPES.some((scope) => name.startsWith(scope)) && manifest.private !== true && manifest.publishConfig?.access === 'public'
}

const workspacePackages = collectWorkspacePackages()

function inspectPackage(packageDir) {
  const packageJsonPath = join(packageDir, 'package.json')
  const manifest = readJson(packageJsonPath)
  const problems = []
  const visited = new Set()

  function visit(packageName, trail) {
    if (visited.has(packageName)) return
    visited.add(packageName)

    const workspacePackage = workspacePackages.get(packageName)
    if (!workspacePackage) return

    const { manifest: currentManifest } = workspacePackage

    if (!isPublicWorkspacePackage(packageName, currentManifest)) {
      problems.push(
        `${trail.join(' -> ')} -> ${packageName} is not publish-safe for public npm ` +
          `(expected scope ${PUBLIC_SCOPES.join(', ')}, access public, non-private)`,
      )
    }

    for (const [dependencyName] of dependencyEntries(currentManifest)) {
      if (workspacePackages.has(dependencyName)) {
        visit(dependencyName, [...trail, packageName])
      }
    }
  }

  if (!isPublicWorkspacePackage(manifest.name, manifest)) {
    problems.push(
      `${manifest.name} is not publish-safe for public npm ` +
        `(expected scope ${PUBLIC_SCOPES.join(', ')}, access public, non-private)`,
    )
  }

  for (const [dependencyName] of dependencyEntries(manifest)) {
    if (workspacePackages.has(dependencyName)) {
      visit(dependencyName, [manifest.name])
    }
  }

  return {
    dir: packageDir,
    manifest,
    problems,
  }
}

let failures = 0

for (const target of TARGETS) {
  const dir = normalizeDir(target)
  const result = inspectPackage(dir)

  if (result.problems.length === 0) {
    console.log(`✓ ${result.manifest.name} is publish-safe for public npm`)
    continue
  }

  failures++
  console.error(`✗ ${result.manifest.name} is not publish-safe for public npm`)
  for (const problem of result.problems) {
    console.error(`  - ${problem}`)
  }
}

if (failures > 0) {
  process.exit(1)
}
