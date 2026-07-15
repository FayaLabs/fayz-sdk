import React, { useEffect } from 'react'

// ---------------------------------------------------------------------------
// StorefrontTheme — the storefront counterpart of SaasTheme.
// Personalizes colors (HSL token triplets), typography (Google Fonts pairing),
// radius and layout properties via CSS custom properties, so every @fayz-ai/ui
// token class (bg-background, text-primary, ...) picks the brand up for free.
//
// Derived from the Nuvemshop template research (docs/storefront-templates-research.md):
// the personalization axes are palette, font pairing, radius, header treatment,
// hero style and product-card style.
// ---------------------------------------------------------------------------

export type StorefrontRadius = 'none' | 'soft' | 'round' | 'pill'
export type HeaderVariant = 'classic' | 'centered' | 'search' | 'minimal'
export type HeroVariant = 'banner' | 'split' | 'slider'
export type CardStyle = 'card' | 'editorial'

export interface StorefrontThemeColors {
  /** HSL triplets, e.g. '40 20% 94%' — same convention as SaasTheme */
  background?: string
  foreground?: string
  primary?: string
  primaryForeground?: string
  card?: string
  cardForeground?: string
  muted?: string
  mutedForeground?: string
  border?: string
  /** Header treatment — dark headers (Brasília) set these */
  headerBackground?: string
  headerForeground?: string
  /** Announcement bar */
  announcementBackground?: string
  announcementForeground?: string
  /** Secondary brand accent (e.g. a gourmet gold beside the primary). Emitted
   *  as `--sf-accent` / `--sf-accent-foreground` and the `accent` tailwind token. */
  accent?: string
  accentForeground?: string
}

export interface StorefrontThemeFont {
  /** Display font for headings, e.g. 'Marcellus' */
  heading: string
  /** Body font, e.g. 'Rubik' */
  body: string
  /** Optional oversized display face for hero words (emitted as `--sf-font-display`). */
  display?: string
  /** Optional serif accent for quotes/editorial (emitted as `--sf-font-serif`). */
  serif?: string
  /** Google Fonts families to load (defaults to heading+body+display+serif) */
  googleFonts?: string[]
  /** Fallback stack — default sans-serif; use 'serif' for editorial themes */
  fallback?: 'sans-serif' | 'serif'
}

export interface StorefrontTheme {
  name: string
  colors?: StorefrontThemeColors
  font?: StorefrontThemeFont
  radius?: StorefrontRadius
  /** Layout personality */
  header?: {
    variant?: HeaderVariant
    /** Uppercase nav links (premium retail tone) */
    uppercaseNav?: boolean
    /** Show category shortcuts after primary nav links. Default true. */
    showCategories?: boolean
    /** Show the storefront search in the header. Default true. */
    showSearch?: boolean
    /** Header search presentation: a full input ('full', default) or a compact
     *  icon button that expands into an input on click ('icon'). */
    searchStyle?: 'full' | 'icon'
  }
  productCard?: {
    style?: CardStyle
    imageAspect?: 'square' | 'portrait'
  }
  /** Uppercase CTA buttons with letter-spacing (Uyuni/Flex tone) */
  uppercaseButtons?: boolean
  /** Brand-token passthrough. Each entry is emitted verbatim as a `--<key>` CSS
   *  custom property, so a store can add gradients, glows, extra colors, or
   *  letter-spacing the fixed schema doesn't enumerate — without editing the SDK.
   *  e.g. { 'grad-ember': 'linear-gradient(...)', 'glow-ember': '0 0 0 1px ...' }. */
  tokens?: Record<string, string>
}

const RADIUS_MAP: Record<StorefrontRadius, { button: string; card: string; input: string }> = {
  none: { button: '0px', card: '0px', input: '0px' },
  soft: { button: '6px', card: '10px', input: '6px' },
  round: { button: '10px', card: '16px', input: '10px' },
  pill: { button: '999px', card: '20px', input: '999px' },
}

const COLOR_VAR_MAP: Record<keyof StorefrontThemeColors, string> = {
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  border: '--border',
  headerBackground: '--sf-header-bg',
  headerForeground: '--sf-header-fg',
  announcementBackground: '--sf-announcement-bg',
  announcementForeground: '--sf-announcement-fg',
  accent: '--sf-accent',
  accentForeground: '--sf-accent-foreground',
}

export function themeToCss(theme: StorefrontTheme): string {
  const lines: string[] = []

  for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP) as [keyof StorefrontThemeColors, string][]) {
    const value = theme.colors?.[key]
    if (value) lines.push(`${cssVar}: ${value};`)
  }
  // Header defaults to the page background unless the theme sets one
  if (!theme.colors?.headerBackground && theme.colors?.background) {
    lines.push(`--sf-header-bg: ${theme.colors.background};`)
  }
  if (!theme.colors?.headerForeground && theme.colors?.foreground) {
    lines.push(`--sf-header-fg: ${theme.colors.foreground};`)
  }

  if (theme.font) {
    const fallback = theme.font.fallback ?? 'sans-serif'
    lines.push(`--font-family: '${theme.font.body}', ${fallback};`)
    lines.push(`--sf-font-heading: '${theme.font.heading}', ${fallback};`)
    if (theme.font.display) lines.push(`--sf-font-display: '${theme.font.display}', ${fallback};`)
    if (theme.font.serif) lines.push(`--sf-font-serif: '${theme.font.serif}', serif;`)
  }

  // Brand-token passthrough — emit each entry as a raw CSS custom property.
  for (const [key, value] of Object.entries(theme.tokens ?? {})) {
    const name = key.startsWith('--') ? key : `--${key}`
    lines.push(`${name}: ${value};`)
  }

  const radius = RADIUS_MAP[theme.radius ?? 'soft']
  lines.push(`--button-radius: ${radius.button};`)
  lines.push(`--card-radius: ${radius.card};`)
  lines.push(`--input-radius: ${radius.input};`)
  lines.push(`--sf-radius-button: ${radius.button};`)
  lines.push(`--sf-radius-card: ${radius.card};`)
  lines.push(`--sf-radius-input: ${radius.input};`)

  let css = `:root {\n  ${lines.join('\n  ')}\n}\n`
  css += `body { font-family: var(--font-family); }\n`
  css += `h1, h2, h3, h4, .sf-heading { font-family: var(--sf-font-heading, var(--font-family)); }\n`
  if (theme.uppercaseButtons) {
    css += `.sf-cta { text-transform: uppercase; letter-spacing: 0.08em; }\n`
  }
  if (theme.header?.uppercaseNav) {
    css += `.sf-nav-link { text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.8rem; }\n`
  }
  return css
}

function googleFontsHref(theme: StorefrontTheme): string | null {
  if (!theme.font) return null
  const families =
    theme.font.googleFonts ??
    [theme.font.heading, theme.font.body, theme.font.display, theme.font.serif].filter(
      (f): f is string => Boolean(f),
    )
  const unique = [...new Set(families)]
  const params = unique
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

/** Injects theme CSS variables + Google Fonts. Mount once inside the app root. */
export function StorefrontThemeStyle({ theme }: { theme: StorefrontTheme }) {
  const fontsHref = googleFontsHref(theme)

  useEffect(() => {
    if (!fontsHref) return
    const id = 'sf-theme-fonts'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = fontsHref
  }, [fontsHref])

  return React.createElement('style', { 'data-sf-theme': theme.name }, themeToCss(theme))
}
