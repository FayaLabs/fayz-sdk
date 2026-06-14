import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'org/index': 'src/org/index.ts',
    'permissions/index': 'src/permissions/index.ts',
    'billing/index': 'src/billing/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', '@fayz-ai/core', '@fayz-ai/auth', '@fayz-ai/ui', '@fayz-ai/saas-core', 'lucide-react', '@tanstack/react-table', 'react-dom'],
})
