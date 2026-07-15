import { defineConfig } from 'tsup'
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'react-router-dom', '@fayz-ai/core', 'lucide-react'],
})
