import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bridge: {
          accent: '#e11d48',
          'accent-dark': '#be123c',
          'accent-light': '#fecdd3',
          'accent-soft': '#fff1f2',
          'accent-wash': '#fff1f2',

          bg: '#fafaf9',
          surface: '#f5f5f4',
          border: '#e7e5e4',
          'border-strong': '#d6d3d1',
          muted: '#78716c',
          secondary: '#57534e',
          text: '#292524',
          heading: '#1c1917',

          rose: '#e11d48',
          roseSoft: '#fff1f2',
          roseLight: '#fecdd3',
          stone: '#1c1917',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['clamp(2.25rem, 5vw, 3.25rem)', { lineHeight: '1.08', fontWeight: '700', letterSpacing: '-0.02em' }],
        heading: ['clamp(1.5rem, 3.5vw, 2rem)', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.015em' }],
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
        card: '0 1px 3px rgba(42,35,32,0.04), 0 1px 2px rgba(42,35,32,0.03)',
        'card-hover': '0 8px 24px rgba(42,35,32,0.08), 0 2px 6px rgba(42,35,32,0.04)',
        modal: '0 -8px 32px rgba(42,35,32,0.12)',
      },
      borderRadius: {
        card: '0.875rem',
        button: '0.625rem',
        input: '0.5rem',
        modal: '1.25rem',
        badge: '9999px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
