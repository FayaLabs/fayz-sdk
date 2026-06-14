import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'app-params': 'src/app-params.ts',
    client: 'src/client.ts',
    'release-channels': 'src/release-channels.ts',
    runtime: 'src/runtime.ts',
    types: 'src/types.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
})
