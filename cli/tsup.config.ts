import { defineConfig } from 'tsup'

export default defineConfig({
  // `index` is the CLI bin. `lib/migration-plan` is emitted separately so the
  // dependency-free `node --test` suite can import the pure planner from dist.
  entry: { index: 'src/index.ts', 'lib/migration-plan': 'src/lib/migration-plan.ts' },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
})
