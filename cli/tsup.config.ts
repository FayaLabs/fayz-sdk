import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
})
