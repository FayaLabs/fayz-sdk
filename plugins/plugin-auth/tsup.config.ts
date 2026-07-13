import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', 'website/index': 'src/website/index.tsx' },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', '@fayz-ai/auth', '@fayz-ai/core', '@fayz-ai/ui', 'lucide-react', '@radix-ui/react-dialog'],
})
