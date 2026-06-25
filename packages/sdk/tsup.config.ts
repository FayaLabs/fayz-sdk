import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'app-params': 'src/app-params.ts',
    client: 'src/client.ts',
    shop: 'src/shop.ts',
    'release-channels': 'src/release-channels.ts',
    'supported-surface': 'src/supported-surface.ts',
    'ai-builder': 'src/ai-builder.ts',
    runtime: 'src/runtime.ts',
    types: 'src/types.ts',
    vite: 'src/vite.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['vite'],
})
