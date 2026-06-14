import { darkTheme, lightTheme, type CreateThemeOptions } from '../stores/theme.store'

export type FayzThemePresetId = 'classic_admin' | 'liquid_glass'

function mergeThemeOptions(base: CreateThemeOptions, overrides: CreateThemeOptions = {}): CreateThemeOptions {
  return {
    ...base,
    ...overrides,
    colors: {
      ...(base.colors ?? {}),
      ...(overrides.colors ?? {}),
    },
    darkColors: {
      ...(base.darkColors ?? {}),
      ...(overrides.darkColors ?? {}),
    },
    perception: {
      ...(base.perception ?? {}),
      ...(overrides.perception ?? {}),
    },
  }
}

export const fayzThemePresets: Record<FayzThemePresetId, CreateThemeOptions> = {
  classic_admin: {
    name: 'classic_admin',
    colors: lightTheme.colors,
    darkColors: darkTheme.colors,
    perception: lightTheme.perception,
  },
  liquid_glass: {
    name: 'liquid_glass',
    colors: {
      background: '260 38% 96%',
      content: '260 36% 96.5%',
      card: '0 0% 100% / 0.84',
      popover: '0 0% 100% / 0.96',
      secondary: '260 34% 93% / 0.82',
      muted: '260 30% 91% / 0.78',
      border: '260 26% 76% / 0.58',
      input: '260 24% 68% / 0.62',
    },
    darkColors: {
      background: '260 28% 9%',
      content: '260 28% 10%',
      card: '260 24% 16% / 0.72',
      popover: '260 24% 14% / 0.9',
      secondary: '260 20% 22% / 0.72',
      muted: '260 18% 20% / 0.68',
      border: '260 20% 35% / 0.58',
      input: '260 20% 38% / 0.68',
    },
    perception: {
      buttonRadius: '9999px',
      cardRadius: '1.25rem',
      inputRadius: '1rem',
      modalRadius: '1.5rem',
      surfaceBackdropFilter: 'blur(16px) saturate(1.24) brightness(1.03)',
      modalBackground:
        'linear-gradient(145deg, rgb(255 255 255 / 0.82), rgb(249 247 255 / 0.72) 48%, rgb(255 255 255 / 0.64))',
      modalBorder: 'rgb(255 255 255 / 0.74)',
      modalOverlayBackground: 'rgb(26 20 38 / 0.22)',
      modalOverlayBackdropFilter: 'blur(5px) saturate(1.08)',
      modalShadow:
        '0 32px 82px -46px rgb(31 18 61 / 0.38), 0 1px 4px rgb(31 18 61 / 0.08), inset 0 1px 0 rgb(255 255 255 / 0.78), inset 0 0 0 1px rgb(255 255 255 / 0.28)',
      glassEdgeGradient:
        'linear-gradient(145deg, rgb(255 255 255 / 0.96) 0%, rgb(255 255 255 / 0.44) 24%, rgb(171 151 211 / 0.34) 48%, rgb(45 35 76 / 0.22) 62%, rgb(255 255 255 / 0.7) 100%)',
      glassPrimaryEdgeGradient:
        'linear-gradient(145deg, rgb(255 255 255 / 0.74) 0%, rgb(255 255 255 / 0.2) 28%, rgb(45 35 76 / 0.34) 58%, rgb(255 255 255 / 0.5) 100%)',
      glassInnerHighlight:
        'inset 0 1px 0 rgb(255 255 255 / 0.72), inset 1px 0 0 rgb(255 255 255 / 0.28), inset 0 -1px 0 rgb(45 35 76 / 0.1)',
      fieldBackground:
        'linear-gradient(135deg, rgb(255 255 255 / 0.9) 0%, rgb(250 248 255 / 0.82) 46%, rgb(242 238 252 / 0.74) 100%)',
      fieldBorder: 'rgb(174 158 205 / 0.58)',
      fieldShadow:
        'inset 0 1px 0 rgb(255 255 255 / 0.8), inset 0 -1px 0 rgb(45 35 76 / 0.08), 0 12px 28px -24px rgb(31 18 61 / 0.28)',
      shadowSm: '0 10px 28px -20px rgb(31 18 61 / 0.34), inset 0 1px 0 rgb(255 255 255 / 0.54)',
      shadowMd: '0 22px 54px -32px rgb(31 18 61 / 0.42), inset 0 1px 0 rgb(255 255 255 / 0.58)',
      shadowLg: '0 34px 88px -42px rgb(31 18 61 / 0.48), inset 0 1px 0 rgb(255 255 255 / 0.62)',
      shadowButton:
        'inset 0 1px 0 rgb(255 255 255 / 0.82), inset 0 -1px 0 rgb(31 18 61 / 0.08), 0 14px 30px -18px rgb(31 18 61 / 0.56)',
      shadowButtonPrimary:
        'inset 0 1px 0 rgb(255 255 255 / 0.5), inset 0 -1px 0 rgb(31 18 61 / 0.26), 0 18px 36px -18px rgb(31 18 61 / 0.86)',
      shadowButtonInset:
        'inset 0 2px 4px rgb(31 18 61 / 0.22), inset 0 0 0 1px rgb(255 255 255 / 0.24)',
      buttonBackground:
        'linear-gradient(135deg, rgb(255 255 255 / 0.92) 0%, rgb(247 242 255 / 0.74) 48%, rgb(229 220 248 / 0.64) 100%)',
      buttonBackgroundHover:
        'linear-gradient(135deg, rgb(255 255 255 / 0.98) 0%, rgb(249 244 255 / 0.86) 46%, rgb(231 222 250 / 0.78) 100%)',
      buttonBorder: 'rgb(194 178 221 / 0.86)',
      buttonPrimaryBackground:
        'linear-gradient(135deg, rgb(255 255 255 / 0.28) 0%, hsl(var(--primary) / 0.94) 36%, hsl(278 42% 58% / 0.88) 100%)',
      buttonPrimaryBackgroundHover:
        'linear-gradient(135deg, rgb(255 255 255 / 0.36) 0%, hsl(var(--primary) / 1) 34%, hsl(278 52% 62% / 0.94) 100%)',
      buttonPrimaryBorder: 'rgb(255 255 255 / 0.38)',
      buttonBackdropFilter: 'blur(18px) saturate(1.45)',
    },
  },
}

export function createFayzTheme(
  preset: FayzThemePresetId = 'classic_admin',
  overrides: CreateThemeOptions = {},
): CreateThemeOptions {
  return mergeThemeOptions(fayzThemePresets[preset] ?? fayzThemePresets.classic_admin, overrides)
}
