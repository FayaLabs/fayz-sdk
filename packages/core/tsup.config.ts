import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'data/index': 'src/data/index.ts',
    'entity/index': 'src/entity/index.ts',
    'plugin/index': 'src/plugin/index.ts',
    'i18n/index': 'src/i18n/index.ts',
    'router/index': 'src/router/index.ts',
    'runtime/index': 'src/runtime/index.ts',
    'types/index': 'src/types/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', '@supabase/supabase-js'],
  noExternal: [],
})
