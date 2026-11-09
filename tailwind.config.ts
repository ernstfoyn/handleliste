import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        paper: '#F7F3EC',
        cream: '#F7F3EC',
        mint: {
          50: '#F1FAF4',
          100: '#DDF3E4',
          200: '#C3E9D2',
          300: '#A4D9BA',
          700: '#1F5C3F',
          950: '#10291D',
        },
        blush: {
          50: '#FDF4F7',
          100: '#F7DCE6',
          200: '#F0C6D6',
          300: '#E4A8BF',
          700: '#7A2E4A',
          950: '#2B111B',
        },
        lilac: {
          50: '#F8F5FE',
          100: '#E9E1F8',
          200: '#DBCEF3',
          300: '#C5B1E8',
          700: '#4A3278',
          950: '#1B122B',
        },
        butter: {
          50: '#FEFAF0',
          100: '#F7ECCB',
          200: '#F0E0AC',
          300: '#E6D184',
          700: '#6B5514',
          950: '#261F07',
        },
        sky: {
          50: '#F3F8FC',
          100: '#DCEAF6',
          200: '#C8DEF0',
          300: '#A9C9E3',
          700: '#1F4D6B',
          950: '#0C1C28',
        },
        brand: {
          50: '#eef9f2',
          100: '#d7f1e1',
          200: '#b0e3c6',
          300: '#7bcda4',
          400: '#46b07e',
          500: '#278f60',
          600: '#1d744c',
          700: '#185d3f',
          800: '#164a34',
          900: '#133e2c',
          950: '#092319',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'ITC Garamond Light Condensed',
          'ITC Garamond',
          'Cormorant Garamond',
          'Garamond',
          'Palatino Linotype',
          'Palatino',
          'Georgia',
          'serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 24px 60px -34px rgba(17, 17, 17, 0.45)',
        lift: '0 14px 34px -18px rgba(17, 17, 17, 0.35)',
        card: '0 22px 50px -38px rgba(17, 17, 17, 0.55)',
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 180ms ease-out',
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
