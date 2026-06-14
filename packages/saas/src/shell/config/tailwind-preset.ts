import type { Config } from 'tailwindcss'

const saasPreset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        magic: {
          DEFAULT: 'hsl(var(--magic))',
          foreground: 'hsl(var(--magic-foreground))',
        },
        'info-soft': {
          DEFAULT: 'hsl(var(--info-soft))',
          foreground: 'hsl(var(--info-soft-foreground))',
        },
        'success-soft': {
          DEFAULT: 'hsl(var(--success-soft))',
          foreground: 'hsl(var(--success-soft-foreground))',
        },
        'warning-soft': {
          DEFAULT: 'hsl(var(--warning-soft))',
          foreground: 'hsl(var(--warning-soft-foreground))',
        },
        'destructive-soft': {
          DEFAULT: 'hsl(var(--destructive-soft))',
          foreground: 'hsl(var(--destructive-soft-foreground))',
        },
        'magic-soft': {
          DEFAULT: 'hsl(var(--magic-soft))',
          foreground: 'hsl(var(--magic-soft-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Layout surface tokens
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
        },
        content: 'hsl(var(--content))',
      },
      borderRadius: {
        button: 'var(--button-radius)',
        card: 'var(--card-radius)',
        input: 'var(--input-radius)',
        modal: 'var(--modal-radius)',
      },
      fontFamily: {
        sans: ['var(--font-family)'],
        mono: ['var(--font-family-mono)'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        button: 'var(--shadow-button)',
        'button-primary': 'var(--shadow-button-primary)',
        'button-inset': 'var(--shadow-button-inset)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'zoom-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'zoom-out': {
          from: { transform: 'scale(1)', opacity: '1' },
          to: { transform: 'scale(0.95)', opacity: '0' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-4px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(4px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out-to-top': {
          from: { transform: 'translateY(0)', opacity: '1' },
          to: { transform: 'translateY(-4px)', opacity: '0' },
        },
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-to-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'zoom-in': 'zoom-in 200ms ease-out',
        'zoom-out': 'zoom-out 150ms ease-in',
        'slide-in-from-top': 'slide-in-from-top 200ms ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 200ms ease-out',
        'slide-out-to-top': 'slide-out-to-top 150ms ease-in',
        'slide-in-from-right': 'slide-in-from-right 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-to-right': 'slide-out-to-right 200ms ease-in',
        'page-in': 'page-in 250ms ease-out',
      },
    },
  },
}

export default saasPreset
