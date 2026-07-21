#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageDir = resolve(scriptDir, '..')
const distEntry = resolve(packageDir, 'dist/index.js')

if (!existsSync(distEntry)) {
  throw new Error('packages/core/dist/index.js is missing. Run `pnpm --filter @fayz-ai/core build` first.')
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

assert.equal(CURRENT_MANIFEST_VERSION, 3, 'SDK current manifest version must stay locked to v3')
assert.equal(appManifestSchema?.properties?.manifestVersion?.const, 3, 'JSON schema must expose manifestVersion.const = 3')
assert.equal(appManifestSchema?.additionalProperties, false, 'JSON schema root must reject unknown AppManifest keys')
assert.equal(appManifestSchema?.properties?.backend?.additionalProperties, false, 'JSON schema backend must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.surface?.additionalProperties, false, 'JSON schema surface must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.pluginRef?.additionalProperties, false, 'JSON schema plugin refs must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.page?.additionalProperties, false, 'JSON schema pages must reject unknown keys')
assert.equal(appManifestSchema?.$defs?.block?.additionalProperties, false, 'JSON schema blocks must reject unknown keys')
assert.deepEqual(validateManifest(validManifest), [], 'v3 canonical manifest must validate')

const legacyProblems = validateManifest({ ...validManifest, manifestVersion: 2 })
assert.ok(legacyProblems.includes('manifest.manifestVersion must be 3'), 'un-migrated v2 manifests must be rejected')

const futureProblems = validateManifest({ ...validManifest, manifestVersion: 4 })
assert.ok(futureProblems.includes('manifest.manifestVersion must be 3'), 'future manifests must be rejected')

// v3 agent contract sections validate loosely at the validator layer (deep
// shape is the JSON schema's job) and hash/limit declarations are checked.
assert.deepEqual(
  validateManifest(mutateManifest((manifest) => {
    manifest.agent = { executionPlane: 'client', tools: [] }
    manifest.limitDeclarations = [{ key: 'clients', table: 'clients' }]
    manifest.contractHash = 'abc123'
  })),
  [],
  'v3 agent sections must validate',
)
assertProblem(
  mutateManifest((manifest) => {
    manifest.limitDeclarations = [{ key: 'clients' }]
  }),
  'manifest.limitDeclarations[0] must declare key and table',
  'limit declarations without a countable table must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.title = 'Legacy title'
  }),
  'manifest.title is not part of AppManifest v3',
  'top-level legacy title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.id = 'legacy-panel-id'
  }),
  'surface "panel".id is not part of AppManifest v3',
  'surface legacy id must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.name = 'Legacy Panel'
  }),
  'surface "panel".name is not part of AppManifest v3',
  'surface legacy name must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.title = 'Legacy surface title'
  }),
  'surface "panel".title is not part of AppManifest v3',
  'surface legacy title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.pages[0].id = 'legacy-page-id'
  }),
  'surface "panel" page #1.id is not part of AppManifest v3',
  'page legacy id must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.pages[0].title = 'Legacy page title'
  }),
  'surface "panel" page #1.title is not part of AppManifest v3',
  'page legacy title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.plugins[0].pluginId = 'legacy-plugin-id'
  }),
  'surface "panel" plugin #1.pluginId is not part of AppManifest v3',
  'legacy pluginId must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.plugins[0].title = 'Legacy plugin title'
  }),
  'surface "panel" plugin #1.title is not part of AppManifest v3',
  'legacy plugin title must be rejected',
)

assertProblem(
  mutateManifest((manifest) => {
    manifest.surfaces.panel.plugins[0].label = 'Legacy plugin label'
  }),
  'surface "panel" plugin #1.label is not part of AppManifest v3',
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
