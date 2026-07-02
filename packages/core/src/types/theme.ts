export type ThemeBrand = 'blue' | 'violet' | 'green' | 'orange' | 'red' | 'pink' | 'teal' | (string & {})
export type ThemeRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'
export type ThemeMode = 'light' | 'dark' | 'system'

// NB: the friendly admin theme shape (SaasTheme) is owned by @fayz-ai/saas
// (shell/config/theme/tokens.ts). A conflicting duplicate used to live here —
// deleted in the Phase-0 foundation cleanup; core only keeps the primitive
// theme unions above.
