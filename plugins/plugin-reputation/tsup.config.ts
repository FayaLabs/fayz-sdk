import { defineConfig } from 'tsup'
export default defineConfig({
  entry: { index: 'src/index.ts', 'public/index': 'src/public/index.tsx' },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', '@fayz-ai/core', '@fayz-ai/ui', '@fayz-ai/auth', '@fayz-ai/saas'],
})
