import { defineConfig } from 'tsup'
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
    'zustand',
    'lucide-react',
    '@fayz-ai/core',
    '@fayz-ai/auth',
    '@fayz-ai/shop',
    '@fayz-ai/shop/runtime',
    '@fayz-ai/shop/mock',
    '@fayz-ai/ui',
  ],
})
