import type { ThemeTokens } from './tokens'

// "Sail midnight" — Polaris/Shopify Admin dark companion. No upstream reference;
// designed from the same philosophy as the light theme: neutral grayscale chrome,
// page bg darker than cards (mirrors the light "card floats on page" hierarchy),
// brand surface is the highest-contrast color (here near-white instead of near-black).
export const darkTheme: ThemeTokens = {
  name: 'dark',
  colors: {
    primary: '0 0% 100%',                 // #ffffff — inverted brand surface
    primaryForeground: '0 0% 10.2%',      // #1a1a1a
    secondary: '0 0% 18.8%',              // #303030
    secondaryForeground: '0 0% 89%',      // #e3e3e3
    accent: '0 0% 22.7%',                 // #3a3a3a — hover/selected one step up from card
    accentForeground: '0 0% 100%',
    background: '0 0% 10.2%',             // #1a1a1a — page
    foreground: '0 0% 89%',               // #e3e3e3
    card: '0 0% 14.9%',                   // #262626 — one step lighter than page
    cardForeground: '0 0% 89%',
    muted: '0 0% 18.8%',                  // #303030
    mutedForeground: '0 0% 64.7%',        // #a5a5a5
    border: '0 0% 22.7%',                 // #3a3a3a — hairline visible on cards
    input: '0 0% 32.2%',                  // #525252
    ring: '217 100% 68.4%',               // #5b9bff — brighter blue for dark
    popover: '0 0% 18.8%',                // popovers sit above cards
    popoverForeground: '0 0% 89%',
    destructive: '7 100% 44.9%',          // #e51c00
    destructiveForeground: '0 0% 100%',
    success: '156 71% 42.5%',             // #1fb87a
    successForeground: '0 0% 0%',
    warning: '41 100% 65.1%',             // #ffc94d
    warningForeground: '0 0% 10.2%',

    // Sidebar matches page; active item is a raised dark pill.
    sidebar: '0 0% 10.2%',                // #1a1a1a
    sidebarForeground: '0 0% 89%',
    sidebarBorder: '0 0% 16.5%',          // #2a2a2a
    sidebarAccent: '0 0% 18.8%',          // #303030
    sidebarAccentForeground: '0 0% 100%',
    sidebarMuted: '0 0% 64.7%',
    content: '0 0% 10.2%',
  },
  perception: {
    buttonRadius: '0.5rem',
    cardRadius: '0.5rem',
    inputRadius: '0.5rem',
    modalRadius: '1rem',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace',
    // Shadows on dark are stronger or they disappear.
    shadowSm: '0 1px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
    shadowMd: '0 1px 1px -1px rgba(0, 0, 0, 0.5), 0 4px 8px -2px rgba(0, 0, 0, 0.6)',
    shadowLg: '0 4px 12px -2px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)',
    // Bevels — top highlight strengthens on near-white primary; on dark default
    // buttons we lean on the inset-bottom shadow for depth.
    shadowButton:
      'inset 0 -1px 0 rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.30)',
    shadowButtonPrimary:
      'inset 0 -1px 0 rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.40), 0 1px 1.5px rgba(0,0,0,0.40)',
    shadowButtonInset:
      'inset 0 2px 1px -1px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(0,0,0,0.20)',
  },
}
