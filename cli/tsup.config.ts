import { defineConfig } from 'tsup'

export default defineConfig({
  // `index` is the CLI bin. `lib/migration-plan` + `lib/supabase-management` are
  // emitted separately so the dependency-free `node --test` suite can import the
  // pure planner and the executor (mocked-fetch) from dist.
  entry: {
    index: 'src/index.ts',
    'lib/manifest': 'src/lib/manifest.ts',
    'lib/migration-plan': 'src/lib/migration-plan.ts',
    'lib/supabase-management': 'src/lib/supabase-management.ts',
    'lib/fayz-platform': 'src/lib/fayz-platform.ts',
    'lib/deploy-files': 'src/lib/deploy-files.ts',
    'commands/deploy': 'src/commands/deploy.ts',
    'commands/skill': 'src/commands/skill.ts',
  },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
})
