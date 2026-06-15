import { defineConfig } from 'tsup'

// The umbrella re-exports the sibling @fayz-ai/* packages; they are installed
// alongside @fayz-ai/app-runtime in the consuming app, so keep them external.
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
    '@fayz-ai/core',
    '@fayz-ai/auth',
    '@fayz-ai/saas',
    '@fayz-ai/ui',
    '@fayz-ai/shop',
    '@fayz-ai/storefront',
  ],
})
