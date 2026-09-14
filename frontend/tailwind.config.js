/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface tokens
        'surface': '#131318',
        'surface-dim': '#131318',
        'surface-bright': '#39383e',
        'surface-container-lowest': '#0e0e13',
        'surface-container-low': '#1b1b20',
        'surface-container': '#1f1f25',
        'surface-container-high': '#2a292f',
        'surface-container-highest': '#35343a',
        'surface-variant': '#35343a',
        'surface-tint': '#e9c349',
        // On-surface tokens
        'on-surface': '#e4e1e9',
        'on-surface-variant': '#d0c5af',
        'inverse-surface': '#e4e1e9',
        'inverse-on-surface': '#303036',
        // Outline
        'outline': '#99907c',
        'outline-variant': '#4d4635',
        // Background
        'background': '#131318',
        'on-background': '#e4e1e9',
        // Primary (gold)
        'primary': '#f2ca50',
        'on-primary': '#3c2f00',
        'primary-container': '#d4af37',
        'on-primary-container': '#554300',
        'inverse-primary': '#735c00',
        'primary-fixed': '#ffe088',
        'primary-fixed-dim': '#e9c349',
        'on-primary-fixed': '#241a00',
        'on-primary-fixed-variant': '#574500',
        // Secondary
        'secondary': '#d4c78b',
        'on-secondary': '#383003',
        'secondary-container': '#4f4717',
        'on-secondary-container': '#c2b67b',
        'secondary-fixed': '#f1e3a4',
        'secondary-fixed-dim': '#d4c78b',
        'on-secondary-fixed': '#211b00',
        'on-secondary-fixed-variant': '#4f4717',
        // Tertiary
        'tertiary': '#ebcc75',
        'on-tertiary': '#3d2f00',
        'tertiary-container': '#ceb05d',
        'on-tertiary-container': '#564300',
        'tertiary-fixed': '#ffe08b',
        'tertiary-fixed-dim': '#e2c46e',
        'on-tertiary-fixed': '#241a00',
        'on-tertiary-fixed-variant': '#584400',
        // Error
        'error': '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-md': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-sm': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'title-lg': ['18px', { lineHeight: '26px', letterSpacing: '0.01em', fontWeight: '600' }],
        'title-md': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }],
        'label-sm': ['10px', { lineHeight: '14px', letterSpacing: '0.1em', fontWeight: '700' }],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'gutter': '1.5rem',
        'margin': '2rem',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
