import { defineConfig } from 'tsup'

export default defineConfig({
  // `index` is the CLI bin. `lib/migration-plan` + `lib/supabase-management` are
  // emitted separately so the dependency-free `node --test` suite can import the
  // pure planner and the executor (mocked-fetch) from dist.
  entry: {
    index: 'src/index.ts',
    'lib/migration-plan': 'src/lib/migration-plan.ts',
    'lib/supabase-management': 'src/lib/supabase-management.ts',
    'lib/fayz-platform': 'src/lib/fayz-platform.ts',
    'lib/deploy-files': 'src/lib/deploy-files.ts',
    'commands/deploy': 'src/commands/deploy.ts',
    'lib/ledger': 'src/lib/ledger.ts',
    'lib/pools': 'src/lib/pools.ts',
    'lib/move-tenant': 'src/lib/move-tenant.ts',
    'lib/app-checks': 'src/lib/app-checks.ts',
  },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
})
