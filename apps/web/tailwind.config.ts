import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bridge: {
          accent: 'var(--bridge-accent)',
          'accent-dark': 'var(--bridge-accent-dark)',
          'accent-light': 'var(--bridge-accent-light)',
          'accent-soft': 'var(--bridge-accent-soft)',
          'accent-wash': 'var(--bridge-accent-wash)',

          ink: 'var(--bridge-ink)',
          'ink-foreground': 'var(--bridge-ink-foreground)',
          'ink-hover': 'var(--bridge-ink-hover)',
          'ink-static': 'var(--bridge-ink-static)',

          bg: 'var(--bridge-bg)',
          surface: 'var(--bridge-surface)',
          card: 'var(--bridge-card)',
          border: 'var(--bridge-border)',
          'border-strong': 'var(--bridge-border-strong)',
          muted: 'var(--bridge-muted)',
          secondary: 'var(--bridge-secondary)',
          text: 'var(--bridge-text)',
          heading: 'var(--bridge-heading)',

          pop: 'var(--bridge-pop)',
          'pop-light': 'var(--bridge-pop-light)',
          'pop-soft': 'var(--bridge-pop-soft)',

          sage: 'var(--bridge-sage)',
          'sage-light': 'var(--bridge-sage-light)',

          'media-placeholder': 'var(--bridge-media-placeholder)',
        },
      },
      fontFamily: {
        display: ['var(--font-body)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        data: ['var(--font-data)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['clamp(2.25rem, 5vw, 3.25rem)', { lineHeight: '1.08', fontWeight: '800', letterSpacing: '-0.03em' }],
        heading: ['clamp(1.5rem, 3.5vw, 2rem)', { lineHeight: '1.15', fontWeight: '800', letterSpacing: '-0.02em' }],
        title: ['1.25rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.6', fontWeight: '400' }],
        body: ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        label: ['0.8125rem', { lineHeight: '1.4', fontWeight: '600' }],
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        micro: ['0.6875rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      spacing: {
        section: '2.5rem',
        'card-padding': '1.25rem',
        'input-y': '0.75rem',
        'input-x': '1rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        modal: 'var(--shadow-modal)',
      },
      borderRadius: {
        card: '0.875rem',
        button: '0.625rem',
        input: '0.5rem',
        modal: '1.25rem',
        badge: '9999px',
        media: 'var(--bridge-media-radius)',
      },
      backgroundImage: {
        'hero-gradient': 'var(--bridge-hero-gradient)',
        'overlay-scrim': 'var(--bridge-overlay-scrim)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.35s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
