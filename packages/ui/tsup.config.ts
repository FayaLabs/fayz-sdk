import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Subpath exports declared in package.json must each be built (the exports map
    // points at these dist files). Without entries here they ship only .d.ts and
    // fail at runtime in the published package.
    'primitives/index': 'src/primitives/index.ts',
    'layout/index': 'src/layout/index.ts',
    'theme/index': 'src/theme/index.ts',
    'dashboard/index': 'src/dashboard/index.ts',
    // Pure Tailwind preset (no React) — safe to import from a postcss/tailwind config.
    preset: 'src/theme/preset.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
})
