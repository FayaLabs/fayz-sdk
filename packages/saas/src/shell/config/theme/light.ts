import type { ThemeTokens } from './tokens'

// Polaris (Shopify Admin "Sail") light theme.
// Page #f1f1f1, cards #ffffff, near-black brand #303030, light sidebar #ebebeb
// with raised-white active items. Semantic accents only carry color.
export const lightTheme: ThemeTokens = {
  name: 'light',
  colors: {
    // Brand surface is near-black, not a saturated hue. Buttons get the bevel
    // shadow below; flat color is only half the look.
    primary: '0 0% 18.8%',                // #303030
    primaryForeground: '0 0% 100%',       // #ffffff
    secondary: '0 0% 96.9%',              // #f7f7f7
    secondaryForeground: '0 0% 18.8%',    // #303030
    accent: '0 0% 94.5%',                 // #f1f1f1 (hover/selected step)
    accentForeground: '0 0% 18.8%',       // #303030
    background: '0 0% 94.5%',             // #f1f1f1 — page is never white
    foreground: '0 0% 18.8%',             // #303030
    card: '0 0% 100%',                    // #ffffff
    cardForeground: '0 0% 18.8%',         // #303030
    muted: '0 0% 96.9%',                  // #f7f7f7
    mutedForeground: '0 0% 38%',          // #616161
    border: '0 0% 89%',                   // #e3e3e3 (hairline, not dark gray)
    input: '0 0% 54.1%',                  // #8a8a8a — inputs need stronger border
    ring: '214 100% 41.4%',               // #005bd3 — focus blue
    popover: '0 0% 100%',
    popoverForeground: '0 0% 18.8%',
    destructive: '354 92% 41%',           // #c70a24
    destructiveForeground: '0 0% 100%',
    success: '167 95% 25.1%',             // #047b5d
    successForeground: '0 0% 100%',
    warning: '43 100% 50%',               // #ffb800
    warningForeground: '0 0% 18.8%',

    // Layout surfaces — light gray rail (Polaris "Sail"), raised white active items.
    sidebar: '0 0% 92.2%',                // #ebebeb
    sidebarForeground: '0 0% 18.8%',      // #303030
    sidebarBorder: '0 0% 86.3%',          // #dcdcdc
    sidebarAccent: '0 0% 100%',           // #ffffff — active item floats above rail
    sidebarAccentForeground: '0 0% 18.8%',
    sidebarMuted: '0 0% 38%',             // #616161
    content: '0 0% 94.5%',                // #f1f1f1
  },
  perception: {
    buttonRadius: '0.5rem',               // 8px (--p-border-radius-200)
    cardRadius: '0.5rem',                 // 8px — Polaris cards are 8px, not 12px
    inputRadius: '0.5rem',
    modalRadius: '1rem',                  // 16px (--p-border-radius-400)
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace',
    // Polaris hairline + a touch of bottom lift so cards visibly float on the gray page.
    shadowSm: '0 1px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(26, 26, 26, 0.06), 0 1px 2px -1px rgba(26, 26, 26, 0.06)',
    shadowMd: '0 1px 1px -1px rgba(26, 26, 26, 0.07), 0 4px 8px -2px rgba(26, 26, 26, 0.10)',
    shadowLg: '0 4px 12px -2px rgba(26, 26, 26, 0.15), 0 1px 3px rgba(26, 26, 26, 0.08)',
    // Inset bevels — Polaris signature. Buttons feel physical because of these.
    shadowButton:
      'inset 0 -1px 0 rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.50), 0 1px 0 rgba(0,0,0,0.05)',
    shadowButtonPrimary:
      'inset 0 -1px 0 rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.20), 0 1px 1.5px rgba(0,0,0,0.20)',
    shadowButtonInset:
      'inset 0 2px 1px -1px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(0,0,0,0.05)',
  },
}
