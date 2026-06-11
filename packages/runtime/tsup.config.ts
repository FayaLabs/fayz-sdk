import { defineConfig } from 'tsup'

// The umbrella re-exports the sibling @fayz/* packages; they are installed
// alongside @fayz/runtime in the consuming app, so keep them external.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@supabase/supabase-js',
    '@fayz/core',
    '@fayz/auth',
    '@fayz/saas',
    '@fayz/ui',
    '@fayz/shop',
    '@fayz/storefront',
  ],
})
