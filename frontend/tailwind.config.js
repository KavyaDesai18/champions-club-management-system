/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ONE Hero Accent: Ball-Optic Yellow (Tennis & Padel Tournament Ball)
        optic: {
          50: '#f9ffe5',
          100: '#f2ffb8',
          200: '#e9ff80',
          300: '#deff47',
          400: '#d4ff1a',
          500: '#ccff00',
          600: '#b0de00',
          700: '#8ca800',
          800: '#6b8200',
          900: '#4f6100',
          950: '#2a3500',
        },
        // Warm Athletic Neutrals (Court Umbers & Night Stadium Slate)
        court: {
          50: '#f7f5f0',
          100: '#efece4',
          200: '#e0dbcf',
          300: '#c5beaf',
          400: '#8e98a4',
          500: '#687482',
          600: '#4a5460',
          700: '#323a43',
          800: '#222830',
          850: '#1c2229',
          900: '#151a20',
          950: '#0e1216',
        },
        // Physical Playing Surface Semantics
        clay: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c', // Roland Garros Clay
          800: '#9a3412',
          900: '#7c2d12',
        },
        grass: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // Wimbledon Lawn
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        hardcourt: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // US Open DecoTurf Blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        chalk: {
          50: '#ffffff',
          100: '#faf8f5',
          200: '#f3efe6',
          300: '#ddd8cd',
          400: '#c7bfb0',
        },
        // Backward-compatible aliases for existing components
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
          950: '#02180b',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        silver: {
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
        },
        surface: {
          800: '#222830',
          900: '#151a20',
          950: '#0e1216',
        }
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        heading: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        'chalk': '0 0 0 1px var(--border-chalk)',
        'court-sm': '0 1px 3px rgba(0, 0, 0, 0.25)',
        'court-md': '0 4px 14px rgba(0, 0, 0, 0.32)',
        'court-lg': '0 12px 30px rgba(0, 0, 0, 0.45)',
        'optic-focus': '0 0 0 3px rgba(204, 255, 0, 0.35)',
      },
    },
  },
  plugins: [],
}
