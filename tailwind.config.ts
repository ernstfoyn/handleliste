import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
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
        cream: '#faf7f0',
        ink: '#1b2a23',
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
          'Iowan Old Style',
          'Palatino Linotype',
          'Palatino',
          'Georgia',
          'ui-serif',
          'serif',
        ],
      },
      boxShadow: {
        soft: '0 18px 45px -24px rgba(18, 63, 44, 0.35)',
        lift: '0 8px 24px -12px rgba(18, 63, 44, 0.28)',
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
