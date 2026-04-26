/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae6ff',
          200: '#bcd1ff',
          300: '#8eb1ff',
          400: '#5b87fc',
          500: '#3a64f4',
          600: '#2849e0',
          700: '#2239b8',
          800: '#1f3493',
          900: '#1f3074',
        },
        ink: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#dde2ea',
          300: '#bbc3d1',
          400: '#8a93a4',
          500: '#5d6577',
          600: '#444b5b',
          700: '#323847',
          800: '#1f2330',
          900: '#13161f',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)',
        'soft-lg':
          '0 4px 12px rgba(15,23,42,0.06), 0 24px 48px -16px rgba(15,23,42,0.18)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
      },
    },
  },
  plugins: [],
};
