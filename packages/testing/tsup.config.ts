import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    reporter: 'src/reporter.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Playwright + Supabase are provided by the consuming app (peer deps); never
  // bundle them — the app's own installed versions must be used at runtime.
  external: ['@playwright/test', '@supabase/supabase-js', 'node:fs', 'node:path'],
})
