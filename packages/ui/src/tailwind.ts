import type { Config } from 'tailwindcss'
import { fayzUiPreset } from './theme/preset'

export interface FayzTailwindOptions {
  /** Extra app-specific content globs, appended after the SDK globs. */
  content?: string[]
  /** SDK source location relative to the app root (default ../../fayz-sdk). */
  sdkDir?: string
}

// SDK packages whose source ships Tailwind class names the app renders.
const SDK_PACKAGES = ['ui', 'saas', 'storefront', 'portal'] as const
const GLOB = '/src/**/*.{ts,tsx}'

/**
 * Shared Tailwind config for Fayz dogfood apps. Applies the Fayz UI preset and
 * scans the SDK shell/UI/plugin source for class names — from node_modules (the
 * Fayz editor sandbox / published) and a sibling `../../fayz-sdk` checkout (local
 * dev). Whichever exists is scanned; missing globs are ignored. Apps no longer
 * hand-maintain content globs or the relative-vs-npm preset import.
 *
 *     import { fayzTailwind } from '@fayz-ai/ui/tailwind'
 *     export default fayzTailwind()
 */
export function fayzTailwind(opts: FayzTailwindOptions = {}): Config {
  const sdk = opts.sdkDir ?? '../../fayz-sdk'
  return {
    presets: [fayzUiPreset as Config],
    darkMode: 'class',
    content: [
      './index.html',
      './src/**/*.{ts,tsx}',
      // Published / sandbox: SDK installed in node_modules (packages ship src/).
      ...SDK_PACKAGES.map((p) => `./node_modules/@fayz-ai/${p}${GLOB}`),
      './node_modules/@fayz-ai/plugin-*/src/**/*.{ts,tsx}',
      // Local dev: SDK as a sibling checkout (matches nothing in production).
      ...SDK_PACKAGES.map((p) => `${sdk}/packages/${p}${GLOB}`),
      `${sdk}/plugins/*/src/**/*.{ts,tsx}`,
      ...(opts.content ?? []),
    ],
    plugins: [],
  }
}
