#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageDir = resolve(scriptDir, '..')
const distEntry = resolve(packageDir, 'dist/index.js')

if (!existsSync(distEntry)) {
  throw new Error('packages/core/dist/index.js is missing. Run `pnpm --filter @fayz/core build` first.')
}

const { CURRENT_MANIFEST_VERSION, appManifestSchema, validateManifest } = await import(distEntry)

const validManifest = {
  manifestVersion: CURRENT_MANIFEST_VERSION,
  id: 'contract-demo',
  name: 'Contract Demo',
  backend: {
    provider: 'supabase',
    projectRef: 'demo-project',
  },
  surfaces: {
    panel: {
      scaffold: 'admin',
      options: {
        title: 'Panel',
      },
      pages: [
        {
          path: '/overview',
          label: 'Overview',
          component: 'custom:Overview',
        },
      ],
      plugins: [
        {
          id: 'plugin-agenda',
          config: {
            label: 'Agenda',
          },
        },
      ],
    },
  },
}

assert.equal(CURRENT_MANIFEST_VERSION, 2, 'SDK current manifest version must stay locked to v2')
assert.equal(appManifestSchema?.properties?.manifestVersion?.const, 2, 'JSON schema must expose manifestVersion.const = 2')
assert.equal(appManifestSchema?.additionalProperties, false, 'JSON schema root must reject unknown AppManifest keys')
assert.equal(appManifestSchema?.properties?.backend?.additionalProperties, false, 'JSON schema backend must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.surface?.additionalProperties, false, 'JSON schema surface must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.pluginRef?.additionalProperties, false, 'JSON schema plugin refs must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.page?.additionalProperties, false, 'JSON schema pages must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.block?.additionalProperties, false, 'JSON schema blocks must reject unknown keys')
assert.deepEqual(validateManifest(validManifest), [], 'v2 canonical manifest must validate')

const legacyProblems = validateManifest({ ...validManifest, manifestVersion: 1 })
assert.ok(legacyProblems.includes('manifest.manifestVersion must be 2'), 'v1 manifests must be rejected')

const futureProblems = validateManifest({ ...validManifest, manifestVersion: 3 })
assert.ok(futureProblems.includes('manifest.manifestVersion must be 2'), 'future manifests must be rejected')

assertProblem(
  mutateManifest((manifest) => {
    manifest.title = 'Legacy title'
  }),
  'manifest.title is not part of AppManifest v2',
  'top-level legacy title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.id = 'legacy-panel-id'
  }),
  'surface "panel".id is not part of AppManifest v2',
  'surface legacy id must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.name = 'Legacy Panel'
  }),
  'surface "panel".name is not part of AppManifest v2',
  'surface legacy name must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.title = 'Legacy surface title'
  }),
  'surface "panel".title is not part of AppManifest v2',
  'surface legacy title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.pages[0].id = 'legacy-page-id'
  }),
  'surface "panel" page #1.id is not part of AppManifest v2',
  'page legacy id must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.pages[0].title = 'Legacy page title'
  }),
  'surface "panel" page #1.title is not part of AppManifest v2',
  'page legacy title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.plugins[0].pluginId = 'legacy-plugin-id'
  }),
  'surface "panel" plugin #1.pluginId is not part of AppManifest v2',
  'legacy pluginId must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.plugins[0].title = 'Legacy plugin title'
  }),
  'surface "panel" plugin #1.title is not part of AppManifest v2',
  'legacy plugin title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.plugins[0].label = 'Legacy plugin label'
  }),
  'surface "panel" plugin #1.label is not part of AppManifest v2',
  'legacy plugin label must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.backend = { provider: 'custom' }
  }),
  'manifest.backend.adapterId is required when provider is "custom"',
  'custom backend without adapterId must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.pages[0].entity = 'orders'
  }),
  'surface "panel" page #1 must set exactly one of blocks/entity/component',
  'pages with multiple renderers must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.pages.push({
      path: '/overview',
      label: 'Duplicate Overview',
      component: 'custom:DuplicateOverview',
    })
  }),
  'surface "panel" declares duplicate page path "/overview"',
  'duplicate page paths must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.plugins.push({
      id: 'plugin-agenda',
      config: {
        label: 'Agenda Duplicate',
      },
    })
  }),
  'surface "panel" declares duplicate plugin id "plugin-agenda"',
  'duplicate plugin ids must be rejected',
)

console.log('AppManifest contract check passed.')

function mutateManifest(mutator) {
  const manifest = JSON.parse(JSON.stringify(validManifest))
  mutator(manifest)
  return manifest
}

function assertProblem(manifest, expectedProblem, label) {
  const problems = validateManifest(manifest)
  assert.ok(
    problems.includes(expectedProblem),
    `${label}: expected "${expectedProblem}", got ${JSON.stringify(problems)}`,
  )
}
